import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

type Action =
  | 'transform'
  | 'questions'
  | 'domain'
  | 'check-blame'
  | 'summary-month'
  | 'plc-pick'
  | 'narrative'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim()
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null

async function callOpenAI(systemPrompt: string, userContent: string, jsonMode = false): Promise<string | null> {
  if (!openai) return null
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      max_tokens: 1024,
    })
    const content = completion.choices[0]?.message?.content?.trim()
    return content || null
  } catch (err) {
    console.error('OpenAI API error:', err)
    return null
  }
}

const BLAME_PATTERNS = [
  /ครูไม่(ให้|ร่วมมือ|สนใจ)/i,
  /นักเรียน(พื้นฐานอ่อน|ไม่ตั้งใจ)/i,
  /ผู้บริหารไม่สนับสนุน/i,
  /ไม่มี(ความร่วมมือ|การร่วมมือ)/i,
]

// แปลงข้อความสั้น → รูปแบบ DE (เหตุ → ผล → ข้อสังเกต) — mock / rule-based
function transformToDE(raw: string, type: 'SUPPORTER' | 'BLOCKER'): { signalText: string; impactText: string; reflectionNote: string } {
  const t = raw.trim()
  if (!t) {
    return {
      signalText: '',
      impactText: '',
      reflectionNote: '',
    }
  }
  // ตัวอย่าง: ถ้ามีคำว่า "ลดงาน" / "ลดภาระ" → เสนอแบบหนุน
  if (type === 'SUPPORTER' && (t.includes('ลด') || t.includes('ปรับ') || t.includes('สนับสนุน'))) {
    return {
      signalText: t.includes('→') ? t : `${t.replace(/\.$/, '')}`,
      impactText: 'ครูมีเวลาแลกเปลี่ยนชิ้นงานผู้เรียนจริง',
      reflectionNote: 'PLC เริ่มตั้งคำถามเชิงลึกมากขึ้น',
    }
  }
  if (type === 'BLOCKER' && (t.includes('งาน') || t.includes('เร่ง') || t.includes('เวลา'))) {
    return {
      signalText: t.includes('→') ? t : t.replace(/\.$/, ''),
      impactText: 'วง PLC ถูกตัดเวลาหรือการสะท้อนผลผู้เรียนไม่ต่อเนื่อง',
      reflectionNote: 'เงื่อนไขใดที่ทำให้ PLC มีพลังมากขึ้น',
    }
  }
  return {
    signalText: t,
    impactText: 'ส่งผลต่อการพัฒนาอย่างไร (แก้ไขได้)',
    reflectionNote: '',
  }
}

// เสนอคำถาม DE 2–3 ข้อ
function suggestQuestions(_signalText: string, _impactText: string): string[] {
  return [
    'เงื่อนไขใดที่ทำให้ PLC มีพลังมากขึ้น',
    'ถ้าขยายการเปลี่ยนแปลงไปยังช่วงอื่น จะเกิดอะไร',
    'ครูใหม่ได้รับผลจากการเปลี่ยนแปลงนี้หรือไม่',
  ]
}

// แนะนำ domain จากเนื้อหา
function suggestDomain(signalText: string, impactText: string): string {
  const text = `${signalText} ${impactText}`.toLowerCase()
  if (text.includes('plc') || text.includes('วง') || text.includes('แลกเปลี่ยน')) return 'PLC'
  if (text.includes('ผู้บริหาร') || text.includes('บริหาร') || text.includes('ตาราง')) return 'Leadership'
  if (text.includes('นักเรียน') || text.includes('ผู้เรียน')) return 'Student'
  if (text.includes('ข้อมูล') || text.includes('สะท้อน')) return 'Data'
  if (text.includes('วัฒนธรรม') || text.includes('บรรยากาศ') || text.includes('ความมั่นใจ')) return 'Culture'
  return 'PLC'
}

// ตรวจภาษาเชิงตำหนิ → แนะนำปรับเป็นเชิงระบบ
function checkBlame(text: string): { isRisky: boolean; suggestion?: string } {
  const t = text.trim()
  if (!t) return { isRisky: false }
  for (const p of BLAME_PATTERNS) {
    if (p.test(t)) {
      return {
        isRisky: true,
        suggestion: 'ต้องการปรับข้อความนี้เป็น "เงื่อนไขเชิงระบบ" ไหม เช่น ครูบางส่วนยังไม่มั่นใจบทบาทใน PLC และยังไม่เห็นผลลัพธ์ที่ชัดจากการเข้าร่วม',
      }
    }
  }
  return { isRisky: false }
}

// สรุปสัญญาณรายเดือน (pattern หนุน/ถ่วง)
function summaryMonth(conditions: { type: string; signalText?: string; impactText?: string; description?: string }[]): { supporters: string; blockers: string; suggest: string } {
  const supporters = conditions.filter((c) => c.type === 'SUPPORTER' || (c as { type?: string }).type === 'supporter')
  const blockers = conditions.filter((c) => c.type === 'BLOCKER' || (c as { type?: string }).type === 'blocker')
  const sText = supporters.map((c) => c.signalText || c.description || '').filter(Boolean).join(' ')
  const bText = blockers.map((c) => c.signalText || c.description || '').filter(Boolean).join(' ')
  return {
    supporters: sText ? `สิ่งที่หนุน: ${sText.slice(0, 200)}${sText.length > 200 ? '…' : ''}` : 'ยังไม่มีสัญญาณที่หนุน',
    blockers: bText ? `สิ่งที่ถ่วง: ${bText.slice(0, 200)}${bText.length > 200 ? '…' : ''}` : 'ยังไม่มีสัญญาณที่ถ่วง',
    suggest: 'เดือนนี้ควรหนุนเพิ่มในระบบที่ถ่วงบ่อย และขยายเงื่อนไขที่หนุนไปยังช่วงอื่น',
  }
}

// เลือก 1 หนุน + 1 ถ่วง สำหรับเปิดวง PLC
function plcPick(conditions: { type: string; signalText?: string; impactText?: string; description?: string }[]): {
  supporter?: string
  blocker?: string
  questions: string[]
} {
  const supporters = conditions.filter((c) => c.type === 'SUPPORTER' || (c as { type?: string }).type === 'supporter')
  const blockers = conditions.filter((c) => c.type === 'BLOCKER' || (c as { type?: string }).type === 'blocker')
  const s = supporters[0]
  const b = blockers[0]
  return {
    supporter: s ? (s.signalText || s.description) : undefined,
    blocker: b ? (b.signalText || b.description) : undefined,
    questions: ['เงื่อนไขใดที่ทำให้สัญญาณที่หนุนขยายได้', 'อะไรจะลดสิ่งที่ถ่วงได้โดยไม่เพิ่มภาระคน'],
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    if (!token) {
      return NextResponse.json<APIResponse>({ success: false, message: 'ไม่พบ access token' }, { status: 401 })
    }
    const decoded = verifyAccessToken(token)
    if (!decoded) {
      return NextResponse.json<APIResponse>({ success: false, message: 'Access token ไม่ถูกต้องหรือหมดอายุ' }, { status: 401 })
    }

    const body = await request.json()
    const action = body.action as Action
    const payload = body.payload ?? {}

    switch (action) {
      case 'transform': {
        const raw = (payload.raw as string) || ''
        const type = (payload.type as 'SUPPORTER' | 'BLOCKER') || 'SUPPORTER'
        const systemPrompt = `คุณเป็นผู้ช่วยเขียนแบบ Developmental Evaluation (DE) สำหรับโรงเรียน
ตอบเป็น JSON เท่านั้น ในรูปแบบ: {"signalText":"สิ่งที่เกิดขึ้น","impactText":"ส่งผลต่อการพัฒนาอย่างไร","reflectionNote":"ข้อสังเกตหรือคำถามเพื่อการพัฒนา"}
- signalText: เหตุการณ์/เงื่อนไขที่เกิดขึ้น (ไม่กล่าวโทษคน ใช้ภาษาเชิงระบบ)
- impactText: ส่งผลต่อครู/ผู้เรียน/PLC อย่างไร
- reflectionNote: คำถามหรือข้อสังเกตสั้น ๆ เพื่อการพัฒนา (ถ้าไม่มีให้ใช้ "")`
        const userContent = `ประเภท: ${type === 'SUPPORTER' ? 'สิ่งที่หนุน' : 'สิ่งที่ถ่วง'}\nข้อความที่ครูพิมพ์: ${raw}\nแปลงเป็นรูปแบบ DE (เหตุ → ผล → ข้อสังเกต) ตอบเป็น JSON เท่านั้น`
        const aiJson = await callOpenAI(systemPrompt, userContent, true)
        let result = transformToDE(raw, type)
        if (aiJson) {
          try {
            const parsed = JSON.parse(aiJson) as { signalText?: string; impactText?: string; reflectionNote?: string }
            if (parsed.signalText) result = { signalText: parsed.signalText, impactText: parsed.impactText || result.impactText, reflectionNote: parsed.reflectionNote || result.reflectionNote }
          } catch {
            // keep rule-based result
          }
        }
        return NextResponse.json<APIResponse>({ success: true, data: result })
      }
      case 'questions': {
        const signalText = (payload.signalText as string) || ''
        const impactText = (payload.impactText as string) || ''
        const systemPrompt = `คุณเป็นผู้ช่วยตั้งคำถาม Developmental Evaluation (DE) สำหรับวง PLC
ตอบเป็น JSON เท่านั้น ในรูปแบบ: {"questions":["คำถามที่ 1","คำถามที่ 2","คำถามที่ 3"]}
ให้ 2-3 คำถามที่ช่วยให้วง PLC คิดต่อยอดจากสัญญาณที่บันทึก (ภาษาไทย)`
        const userContent = `สัญญาณ: ${signalText}\nผลกระทบ: ${impactText}\nเสนอ 2-3 คำถาม DE สำหรับวง PLC (ตอบเป็น JSON เท่านั้น)`
        const aiJson = await callOpenAI(systemPrompt, userContent, true)
        let questions = suggestQuestions(signalText, impactText)
        if (aiJson) {
          try {
            const parsed = JSON.parse(aiJson) as { questions?: string[] }
            if (Array.isArray(parsed.questions) && parsed.questions.length) questions = parsed.questions
          } catch {
            // keep default
          }
        }
        return NextResponse.json<APIResponse>({ success: true, data: { questions } })
      }
      case 'domain': {
        const signalText = (payload.signalText as string) || ''
        const impactText = (payload.impactText as string) || ''
        const domain = suggestDomain(signalText, impactText)
        return NextResponse.json<APIResponse>({ success: true, data: { domain } })
      }
      case 'check-blame': {
        const text = (payload.text as string) || ''
        const systemPrompt = `คุณเป็นผู้ช่วยตรวจข้อความเชิง Developmental Evaluation (DE)
ถ้าข้อความมีลักษณะ "กล่าวโทษคน" หรือ "ตำหนิบุคคล" (เช่น ครูไม่ให้ความร่วมมือ นักเรียนพื้นฐานอ่อน) ให้ตอบเป็น JSON: {"isRisky":true,"suggestion":"ข้อความแนะนำแบบเชิงระบบ ไม่กล่าวโทษคน"}
ถ้าไม่มีปัญหาให้ตอบ: {"isRisky":false}
suggestion ต้องเป็นประโยคเดียว ภาษาไทย อธิบายเป็นเงื่อนไข/ระบบ แทนการกล่าวโทษ`
        const userContent = `ตรวจข้อความ: ${text}\nตอบเป็น JSON เท่านั้น`
        const aiJson = await callOpenAI(systemPrompt, userContent, true)
        let result = checkBlame(text)
        if (aiJson) {
          try {
            const parsed = JSON.parse(aiJson) as { isRisky?: boolean; suggestion?: string }
            if (typeof parsed.isRisky === 'boolean') result = { isRisky: parsed.isRisky, suggestion: parsed.suggestion }
          } catch {
            // keep rule-based
          }
        }
        return NextResponse.json<APIResponse>({ success: true, data: result })
      }
      case 'summary-month': {
        const conditions = (payload.conditions as Array<{ type: string; signalText?: string; impactText?: string; description?: string }>) || []
        const systemPrompt = `คุณเป็นผู้ช่วยสรุปสัญญาณการพัฒนา (DE) รายเดือน
จากรายการสัญญาณที่หนุนและถ่วง ให้สรุปเป็น 3 ส่วน สั้น ๆ ภาษาไทย ตอบเป็น JSON:
{"supporters":"สรุป pattern สิ่งที่หนุน","blockers":"สรุป pattern สิ่งที่ถ่วง","suggest":"ข้อเสนอว่าควรหนุนระบบไหนเพิ่ม"}`
        const text = conditions.map((c) => `${c.type}: ${c.signalText || c.description || ''} → ${c.impactText || ''}`).join('\n')
        const aiJson = await callOpenAI(systemPrompt, text || 'ยังไม่มีข้อมูล', true)
        const result = summaryMonth(conditions)
        if (aiJson) {
          try {
            const parsed = JSON.parse(aiJson) as { supporters?: string; blockers?: string; suggest?: string }
            if (parsed.supporters) result.supporters = parsed.supporters
            if (parsed.blockers) result.blockers = parsed.blockers
            if (parsed.suggest) result.suggest = parsed.suggest
          } catch {
            // keep rule-based
          }
        }
        return NextResponse.json<APIResponse>({ success: true, data: result })
      }
      case 'plc-pick': {
        const conditions = (payload.conditions as Array<{ type: string; signalText?: string; impactText?: string; description?: string }>) || []
        const systemPrompt = `คุณเป็นผู้ช่วยเลือกประเด็นคุย PLC จากสัญญาณที่หนุนและถ่วง
ตอบเป็น JSON: {"supporter":"ข้อความ 1 สัญญาณที่หนุน (ขยายผล)","blocker":"ข้อความ 1 สัญญาณที่ถ่วง (ออกแบบแก้)","questions":["คำถาม DE ข้อ 1","คำถาม DE ข้อ 2"]}
ถ้าไม่มีสัญญาณที่หนุนหรือถ่วง ให้ใช้ "" สำหรับส่วนนั้น questions ต้อง 2 ข้อ ภาษาไทย`
        const text = conditions.map((c) => `${c.type}: ${c.signalText || c.description || ''}`).join('\n')
        const aiJson = await callOpenAI(systemPrompt, text || 'ยังไม่มีข้อมูล', true)
        const result = plcPick(conditions)
        if (aiJson) {
          try {
            const parsed = JSON.parse(aiJson) as { supporter?: string; blocker?: string; questions?: string[] }
            if (parsed.supporter != null) result.supporter = parsed.supporter
            if (parsed.blocker != null) result.blocker = parsed.blocker
            if (Array.isArray(parsed.questions)) result.questions = parsed.questions
          } catch {
            // keep rule-based
          }
        }
        return NextResponse.json<APIResponse>({ success: true, data: result })
      }
      case 'narrative': {
        const conditions = (payload.conditions as unknown[]) || []
        const context = (payload.context as string) || ''
        const systemPrompt = `คุณเป็นผู้ช่วยเขียน Narrative สรุปสัญญาณการพัฒนา (DE) สำหรับส่งเขต/มูลนิธิ
จากข้อมูลสัญญาณที่หนุนและถ่วง ให้เขียนเป็นย่อหน้าเชิงพัฒนา ภาษาไทย น้ำเสียง "เรียนรู้เชิงระบบ" ไม่กล่าวโทษคน ไม่ยาวเกิน 3-4 ประโยค`
        const text = context + (conditions.length ? `\nรายการ: ${JSON.stringify(conditions)}` : '')
        const aiText = await callOpenAI(systemPrompt, text || 'ยังไม่มีข้อมูล', false)
        const narrative = aiText || `สรุปสัญญาณการพัฒนา: ${context}\n(กรุณาบันทึกสัญญาณก่อนใช้ฟีเจอร์ narrative)`
        return NextResponse.json<APIResponse>({ success: true, data: { narrative, conditionsCount: conditions?.length ?? 0 } })
      }
      default:
        return NextResponse.json<APIResponse>({ success: false, message: 'action ไม่รู้จัก' }, { status: 400 })
    }
  } catch (error) {
    console.error('DE Co-Pilot error:', error)
    return NextResponse.json<APIResponse>({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
