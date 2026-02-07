'use client'

import { useEffect, useState } from 'react'

interface DEDashboardData {
  learningTimeline: Array<{ id: string; month: string; content: string; source: string; domain?: string }>
  plcQuality: { safetyLevel: number; questionDepth: number; studentConnection: number; actionFollowUp: number } | null
  studentSignals: Array<{ id: string; studentCode: string; signalDescription: string; changeDescription?: string }>
  experiments: Array<{ id: string; title: string; status: string; lessonLearned?: string; willContinue?: boolean }>
  latestReflection: { continueItems?: string; stopItems?: string; expandItems?: string; nextSteps?: string; systemReflection?: string } | null
  conditions: { supporters: Array<{ id: string; signalText?: string; domain?: string }>; blockers: Array<{ id: string; signalText?: string; domain?: string }> }
}

interface DEQuestion {
  monthNumber: number
  focus: string
  questions: string[]
}

export default function DECanvasPage() {
  const [data, setData] = useState<DEDashboardData | null>(null)
  const [questions, setQuestions] = useState<DEQuestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const headers = { Authorization: `Bearer ${token}` }
      const [dashRes, qRes] = await Promise.all([
        fetch('/api/de/dashboard', { headers }),
        fetch('/api/de/questions'),
      ])
      const dashJson = await dashRes.json()
      const qJson = await qRes.json()
      if (dashJson.success) setData(dashJson.data)
      if (qJson.success) setQuestions(qJson.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const currentMonthNum = new Date().getMonth() + 1
  const currentQ = questions.find((q) => q.monthNumber === currentMonthNum)

  if (loading) return <div className="text-center py-12 text-gray-500">กำลังโหลด DE Canvas...</div>

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-6 text-white">
        <h1 className="text-xl font-bold">DE Canvas : โรงเรียนในฐานะระบบเรียนรู้</h1>
        <p className="text-purple-200 text-sm mt-1">ใช้แบบประเมินเพื่อออกแบบการเรียนรู้ของระบบ ไม่ใช่เพื่อพิสูจน์ว่าโรงเรียนดีหรือไม่ดี</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. PURPOSE */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-purple-200 dark:border-purple-800 shadow-sm">
          <h2 className="text-lg font-bold text-purple-700 dark:text-purple-400 mb-2">PURPOSE</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">เรากำลังพัฒนา &quot;อะไร&quot; จริง ๆ — คุณค่าที่อยากเห็นเกิดกับผู้เรียนและครู</p>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <strong>ผู้เรียน:</strong> กล้าคิด กล้าสะท้อน รู้จักตนเอง
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <strong>ครู:</strong> ใช้ข้อมูลจริง ปรับการสอนจริง
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <strong>โรงเรียน:</strong> เป็นพื้นที่ปลอดภัยในการเรียนรู้ร่วมกัน
            </div>
          </div>
        </div>

        {/* 2. SYSTEMS */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-blue-200 dark:border-blue-800 shadow-sm">
          <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-2">SYSTEMS</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">4 ระบบหลักที่ต้องขยับ — ระบบไหน &quot;เป็นคันเร่ง&quot; และระบบไหน &quot;เป็นเบรก&quot;?</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: 'A: ผู้นำและทิศทาง', items: 'เป้าหมายร่วม, แผนเชิงผลลัพธ์, การสื่อสาร', domain: 'Leadership' },
              { label: 'B: การเรียนรู้ของครู (PLC)', items: 'ชั่วโมง PLC, คุณภาพการแลกเปลี่ยน, Open Class', domain: 'PLC' },
              { label: 'C: การใช้ข้อมูลเพื่อพัฒนา', items: 'ข้อมูลรายบุคคล, วิเคราะห์ก่อน-หลัง, Q-Info', domain: 'Data' },
              { label: 'D: พลังใจและวัฒนธรรม', items: 'แรงจูงใจภายใน, Positive feedback, ความปลอดภัย', domain: 'Culture' },
            ].map((sys) => (
              <div key={sys.domain} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="font-semibold text-blue-700 dark:text-blue-400">{sys.label}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{sys.items}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. CURRENT SIGNALS */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-green-200 dark:border-green-800 shadow-sm">
          <h2 className="text-lg font-bold text-green-700 dark:text-green-400 mb-2">CURRENT SIGNALS</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">สัญญาณที่บอกว่าเรายังอยู่ตรงนี้ (ไม่เรียกจุดอ่อน)</p>
          {data?.learningTimeline && data.learningTimeline.length > 0 ? (
            <div className="space-y-2">
              {data.learningTimeline.slice(0, 4).map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">●</span>
                  <div>
                    <span className="text-gray-700 dark:text-gray-300">{log.content}</span>
                    <span className="text-xs text-gray-400 ml-2">{log.month}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">ยังไม่มีข้อมูล — เพิ่มได้ที่ Learning Timeline</p>
          )}
        </div>

        {/* 4. KEY QUESTIONS */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-amber-200 dark:border-amber-800 shadow-sm">
          <h2 className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-2">KEY QUESTIONS</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">คำถาม DE ประจำเดือนที่ {currentMonthNum}: {currentQ?.focus || '-'}</p>
          {currentQ ? (
            <div className="space-y-2">
              {currentQ.questions.map((q, i) => (
                <div key={i} className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
                  {i + 1}. {q}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">ไม่มีคำถามสำหรับเดือนนี้</p>
          )}
        </div>

        {/* 5. EXPERIMENTS */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-pink-200 dark:border-pink-800 shadow-sm">
          <h2 className="text-lg font-bold text-pink-700 dark:text-pink-400 mb-2">EXPERIMENTS</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">ลองเล็ก ๆ — เรียนเร็ว (4-8 สัปดาห์)</p>
          {data?.experiments && data.experiments.length > 0 ? (
            <div className="space-y-2">
              {data.experiments.slice(0, 3).map((exp) => (
                <div key={exp.id} className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      exp.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      exp.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>{exp.status}</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{exp.title}</span>
                  </div>
                  {exp.lessonLearned && <p className="text-xs text-gray-500 mt-1">บทเรียน: {exp.lessonLearned}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">ยังไม่มีการทดลอง — เพิ่มได้ที่ Experiments</p>
          )}
        </div>

        {/* 6. LEARNING EVIDENCE */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800 shadow-sm">
          <h2 className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mb-2">LEARNING EVIDENCE</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">หลักฐานการเรียนรู้ — ไม่ต้องรอคะแนนรอบหน้า</p>
          {data?.studentSignals && data.studentSignals.length > 0 ? (
            <div className="space-y-2">
              {data.studentSignals.slice(0, 3).map((sig) => (
                <div key={sig.id} className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-sm">
                  <div className="font-medium text-gray-700 dark:text-gray-300">&quot;{sig.studentCode}&quot; — {sig.signalDescription}</div>
                  {sig.changeDescription && <p className="text-xs text-gray-500 mt-1">{sig.changeDescription}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">ยังไม่มี — เพิ่มได้ที่ Student Signals</p>
          )}
        </div>
      </div>

      {/* 7. ADAPTATION */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-violet-200 dark:border-violet-800 shadow-sm">
        <h2 className="text-lg font-bold text-violet-700 dark:text-violet-400 mb-2">ADAPTATION — การปรับทิศ</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">DE สำเร็จเมื่อโรงเรียน &quot;ปรับตัวได้เอง&quot; โดยไม่ต้องรอคำสั่ง</p>
        {data?.latestReflection ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="font-semibold text-green-700 dark:text-green-400">ทำต่อ</div>
              <p className="text-gray-700 dark:text-gray-300 mt-1">{data.latestReflection.continueItems || '-'}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <div className="font-semibold text-red-700 dark:text-red-400">หยุด</div>
              <p className="text-gray-700 dark:text-gray-300 mt-1">{data.latestReflection.stopItems || '-'}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="font-semibold text-blue-700 dark:text-blue-400">ขยาย</div>
              <p className="text-gray-700 dark:text-gray-300 mt-1">{data.latestReflection.expandItems || '-'}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">ยังไม่มี Reflection — เพิ่มได้ที่ Monthly Reflection</p>
        )}
      </div>

      {/* CONDITIONS */}
      {data?.conditions && (data.conditions.supporters.length > 0 || data.conditions.blockers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-green-200 dark:border-green-800 shadow-sm">
            <h3 className="font-bold text-green-700 dark:text-green-400 mb-2">สิ่งที่หนุน</h3>
            {data.conditions.supporters.map((s) => (
              <div key={s.id} className="text-sm text-gray-700 dark:text-gray-300 mb-1">● {s.signalText || '-'}</div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-red-200 dark:border-red-800 shadow-sm">
            <h3 className="font-bold text-red-700 dark:text-red-400 mb-2">สิ่งที่ถ่วง</h3>
            {data.conditions.blockers.map((b) => (
              <div key={b.id} className="text-sm text-gray-700 dark:text-gray-300 mb-1">● {b.signalText || '-'}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
