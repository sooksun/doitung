import { NextRequest, NextResponse } from 'next/server'
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
        const result = transformToDE(raw, type)
        return NextResponse.json<APIResponse>({ success: true, data: result })
      }
      case 'questions': {
        const signalText = (payload.signalText as string) || ''
        const impactText = (payload.impactText as string) || ''
        const questions = suggestQuestions(signalText, impactText)
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
        const result = checkBlame(text)
        return NextResponse.json<APIResponse>({ success: true, data: result })
      }
      case 'summary-month': {
        const conditions = (payload.conditions as Array<{ type: string; signalText?: string; impactText?: string; description?: string }>) || []
        const result = summaryMonth(conditions)
        return NextResponse.json<APIResponse>({ success: true, data: result })
      }
      case 'plc-pick': {
        const conditions = (payload.conditions as Array<{ type: string; signalText?: string; impactText?: string; description?: string }>) || []
        const result = plcPick(conditions)
        return NextResponse.json<APIResponse>({ success: true, data: result })
      }
      case 'narrative': {
        const conditions = payload.conditions as unknown[]
        const context = (payload.context as string) || ''
        const narrative = `สรุปสัญญาณการพัฒนา: ${context}\nจากข้อมูลที่มี AI จะสังเคราะห์เป็น narrative ส่งเขต/มูลนิธิได้เมื่อเชื่อมต่อ LLM (OPENAI_API_KEY). ขณะนี้ใช้โหมดแนะนำจาก pattern.`
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
