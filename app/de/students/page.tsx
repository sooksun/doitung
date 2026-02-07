'use client'

import { useEffect, useState } from 'react'

interface StudentSignal {
  id: string; month: string; studentCode: string; signalDescription: string
  changeDescription?: string; teacherAction?: string
  createdBy: { firstName: string; lastName: string }
}

export default function StudentSignalsPage() {
  const [signals, setSignals] = useState<StudentSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ month: '', studentCode: '', signalDescription: '', changeDescription: '', teacherAction: '' })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/de/student-signals', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (json.success) setSignals(json.data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const res = await fetch('/api/de/student-signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ schoolId: user.schoolId, ...form }),
    })
    const json = await res.json()
    if (json.success) {
      setShowForm(false)
      setForm({ month: '', studentCode: '', signalDescription: '', changeDescription: '', teacherAction: '' })
      fetchData()
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">กำลังโหลด...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Student Signals</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">เรื่องเล่าการเปลี่ยนแปลงของผู้เรียน — 1 เรื่องมีค่ามากกว่า 10 กราฟ</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">
          {showForm ? 'ยกเลิก' : '+ เพิ่ม Story Card'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เดือน (YYYY-MM)</label>
              <input value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} placeholder="2568-07" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รหัสผู้เรียน (ไม่ระบุชื่อจริง)</label>
              <input value={form.studentCode} onChange={(e) => setForm({ ...form, studentCode: e.target.value })} placeholder="ด.ช.ก." className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">สัญญาณที่เห็น</label>
            <textarea value={form.signalDescription} onChange={(e) => setForm({ ...form, signalDescription: e.target.value })} rows={2} placeholder="จากไม่ส่งงาน เริ่มสะท้อนสิ่งที่ไม่เข้าใจ" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">การเปลี่ยนแปลงที่เกิดขึ้น</label>
            <textarea value={form.changeDescription} onChange={(e) => setForm({ ...form, changeDescription: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">สิ่งที่ครูปรับ</label>
            <textarea value={form.teacherAction} onChange={(e) => setForm({ ...form, teacherAction: e.target.value })} rows={2} placeholder="ครูเปลี่ยนคำถาม ไม่ใช่เพิ่มงาน" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <button type="submit" className="px-6 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">บันทึก</button>
        </form>
      )}

      {/* Story Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {signals.map((sig) => (
          <div key={sig.id} className="bg-white dark:bg-gray-800 rounded-xl border border-orange-200 dark:border-orange-800 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3">
              <div className="flex items-center gap-2 text-white">
                <span className="text-xl">🧒</span>
                <span className="font-bold">&quot;{sig.studentCode}&quot;</span>
                <span className="text-orange-100 text-xs ml-auto">{sig.month}</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">สัญญาณที่เห็น</div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{sig.signalDescription}</p>
              </div>
              {sig.changeDescription && (
                <div>
                  <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">การเปลี่ยนแปลง</div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{sig.changeDescription}</p>
                </div>
              )}
              {sig.teacherAction && (
                <div>
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">สิ่งที่ครูปรับ</div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{sig.teacherAction}</p>
                </div>
              )}
              <div className="text-xs text-gray-400">โดย {sig.createdBy.firstName} {sig.createdBy.lastName}</div>
            </div>
          </div>
        ))}
      </div>
      {signals.length === 0 && <p className="text-center py-8 text-gray-400">ยังไม่มี Story Card — กดปุ่มด้านบนเพื่อเพิ่ม</p>}
    </div>
  )
}
