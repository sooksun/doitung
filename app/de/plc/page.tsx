'use client'

import { useEffect, useState } from 'react'

interface PLCSession {
  id: string; sessionDate: string; month: string; participants: number
  deQuestionUsed?: string; keyInsight?: string
  safetyLevel?: number; questionDepth?: number; studentConnection?: number; actionFollowUp?: number
  deeperThinking?: boolean; nextTry?: string
  createdBy: { firstName: string; lastName: string }
}

interface DEQuestion { monthNumber: number; focus: string; questions: string[]; expectedOutcome?: string }

export default function PLCSessionsPage() {
  const [sessions, setSessions] = useState<PLCSession[]>([])
  const [questions, setQuestions] = useState<DEQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ sessionDate: '', month: '', participants: '', deQuestionUsed: '', keyInsight: '', safetyLevel: '', questionDepth: '', studentConnection: '', actionFollowUp: '', deeperThinking: false, nextTry: '' })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const headers = { Authorization: `Bearer ${token}` }
      const [sessRes, qRes] = await Promise.all([
        fetch('/api/de/plc-sessions', { headers }),
        fetch('/api/de/questions'),
      ])
      const sessJson = await sessRes.json()
      const qJson = await qRes.json()
      if (sessJson.success) setSessions(sessJson.data)
      if (qJson.success) setQuestions(qJson.data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const res = await fetch('/api/de/plc-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        schoolId: user.schoolId,
        sessionDate: form.sessionDate,
        month: form.month,
        participants: parseInt(form.participants) || 0,
        deQuestionUsed: form.deQuestionUsed,
        keyInsight: form.keyInsight,
        safetyLevel: parseInt(form.safetyLevel) || undefined,
        questionDepth: parseInt(form.questionDepth) || undefined,
        studentConnection: parseInt(form.studentConnection) || undefined,
        actionFollowUp: parseInt(form.actionFollowUp) || undefined,
        deeperThinking: form.deeperThinking,
        nextTry: form.nextTry,
      }),
    })
    const json = await res.json()
    if (json.success) {
      setShowForm(false)
      setForm({ sessionDate: '', month: '', participants: '', deQuestionUsed: '', keyInsight: '', safetyLevel: '', questionDepth: '', studentConnection: '', actionFollowUp: '', deeperThinking: false, nextTry: '' })
      fetchData()
    }
  }

  const currentMonthNum = new Date().getMonth() + 1
  const currentQ = questions.find((q) => q.monthNumber === currentMonthNum)

  const SignalBar = ({ value, max = 5 }: { value?: number; max?: number }) => (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className={`w-5 h-3 rounded-sm ${i < (value || 0) ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-600'}`} />
      ))}
    </div>
  )

  if (loading) return <div className="text-center py-12 text-gray-500">กำลังโหลด...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">PLC Sessions</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
          {showForm ? 'ยกเลิก' : '+ บันทึก PLC ใหม่'}
        </button>
      </div>

      {/* DE Question Cards */}
      {currentQ && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 border border-amber-200 dark:border-amber-800">
          <h2 className="font-bold text-amber-700 dark:text-amber-400 mb-1">คำถาม DE เดือนที่ {currentMonthNum}</h2>
          <p className="text-xs text-gray-500 mb-3">โฟกัส: {currentQ.focus}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {currentQ.questions.map((q, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 border border-amber-100 dark:border-amber-800">
                {q}
              </div>
            ))}
          </div>
          {currentQ.expectedOutcome && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">ผลลัพธ์ที่อยากเห็น: {currentQ.expectedOutcome}</p>
          )}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วันที่ PLC</label>
              <input type="date" value={form.sessionDate} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เดือน (YYYY-MM)</label>
              <input value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} placeholder="2568-06" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">จำนวนผู้เข้าร่วม</label>
              <input type="number" value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">คำถาม DE ที่ใช้ในวง</label>
            <textarea value={form.deQuestionUsed} onChange={(e) => setForm({ ...form, deQuestionUsed: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">สิ่งที่ได้เรียนรู้จากวง (Key Insight)</label>
            <textarea value={form.keyInsight} onChange={(e) => setForm({ ...form, keyInsight: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quality Signals (1-5)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'safetyLevel', label: 'ความปลอดภัยในการพูด' },
                { key: 'questionDepth', label: 'ความลึกของคำถาม' },
                { key: 'studentConnection', label: 'เชื่อมกับผู้เรียน' },
                { key: 'actionFollowUp', label: 'ทดลองจริงหลัง PLC' },
              ].map((s) => (
                <div key={s.key}>
                  <label className="text-xs text-gray-500 dark:text-gray-400">{s.label}</label>
                  <select value={form[s.key as keyof typeof form] as string} onChange={(e) => setForm({ ...form, [s.key]: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                    <option value="">-</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.deeperThinking} onChange={(e) => setForm({ ...form, deeperThinking: e.target.checked })} className="rounded" />
              วันนี้วงช่วยให้คิดลึกขึ้นไหม
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">อยากลองอะไรหลังจากนี้</label>
            <input value={form.nextTry} onChange={(e) => setForm({ ...form, nextTry: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">บันทึก</button>
        </form>
      )}

      {/* Sessions List */}
      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-gray-800 dark:text-white">{new Date(s.sessionDate).toLocaleDateString('th-TH', { dateStyle: 'long' })}</div>
                <div className="text-xs text-gray-500">{s.month} | {s.participants} คน | โดย {s.createdBy.firstName} {s.createdBy.lastName}</div>
              </div>
              {s.deeperThinking !== null && (
                <span className={`px-2 py-0.5 rounded text-xs ${s.deeperThinking ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {s.deeperThinking ? 'คิดลึกขึ้น' : 'ยังปกติ'}
                </span>
              )}
            </div>
            {s.deQuestionUsed && <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">คำถาม: {s.deQuestionUsed}</p>}
            {s.keyInsight && <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">สิ่งที่เรียนรู้: {s.keyInsight}</p>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'ปลอดภัย', value: s.safetyLevel },
                { label: 'ลึก', value: s.questionDepth },
                { label: 'เชื่อมเด็ก', value: s.studentConnection },
                { label: 'ทดลอง', value: s.actionFollowUp },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <SignalBar value={item.value} />
                  <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
            {s.nextTry && <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">อยากลอง: {s.nextTry}</p>}
          </div>
        ))}
        {sessions.length === 0 && <p className="text-center py-8 text-gray-400">ยังไม่มี PLC Session — กดปุ่มด้านบนเพื่อเพิ่ม</p>}
      </div>
    </div>
  )
}
