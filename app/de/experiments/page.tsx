'use client'

import { useEffect, useState } from 'react'

interface Experiment {
  id: string; month: string; title: string; description?: string; domain?: string
  duration?: string; status: string; lessonLearned?: string; willContinue?: boolean
  createdBy: { firstName: string; lastName: string }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PLANNED: { label: 'วางแผนไว้', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  IN_PROGRESS: { label: 'กำลังทดลอง', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  COMPLETED: { label: 'เสร็จแล้ว', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
}

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ month: '', title: '', description: '', domain: '', duration: '4 สัปดาห์', status: 'PLANNED', lessonLearned: '', willContinue: false })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/de/experiments', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (json.success) setExperiments(json.data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const res = await fetch('/api/de/experiments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ schoolId: user.schoolId, ...form }),
    })
    const json = await res.json()
    if (json.success) {
      setShowForm(false)
      setForm({ month: '', title: '', description: '', domain: '', duration: '4 สัปดาห์', status: 'PLANNED', lessonLearned: '', willContinue: false })
      fetchData()
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">กำลังโหลด...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Experiments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">ลองเล็ก ๆ แต่ตั้งใจ — DE ไม่สั่งโครงการใหญ่ แต่ &quot;ลองเล็ก–เรียนเร็ว&quot;</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700">
          {showForm ? 'ยกเลิก' : '+ เพิ่มการทดลอง'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const count = experiments.filter((e) => e.status === key).length
          return (
            <div key={key} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{count}</div>
              <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${cfg.color}`}>{cfg.label}</div>
            </div>
          )
        })}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เดือนเริ่มต้น (YYYY-MM)</label>
              <input value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} placeholder="2568-06" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ระยะเวลา</label>
              <select value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                <option value="2 สัปดาห์">2 สัปดาห์</option>
                <option value="4 สัปดาห์">4 สัปดาห์</option>
                <option value="6 สัปดาห์">6 สัปดาห์</option>
                <option value="8 สัปดาห์">8 สัปดาห์</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ระบบที่เกี่ยวข้อง</label>
              <select value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                <option value="">-</option>
                {['Leadership', 'PLC', 'Student', 'Data', 'Culture'].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อการทดลอง</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder='เปลี่ยน PLC จาก "รายงาน" → "ดูชิ้นงานนักเรียนจริง"' className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รายละเอียด</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <button type="submit" className="px-6 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700">บันทึก</button>
        </form>
      )}

      {/* Experiments List */}
      <div className="space-y-3">
        {experiments.map((exp) => (
          <div key={exp.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">{exp.title}</h3>
                <div className="flex gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig[exp.status]?.color}`}>
                    {statusConfig[exp.status]?.label}
                  </span>
                  {exp.domain && <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{exp.domain}</span>}
                  {exp.duration && <span className="text-xs text-gray-400">{exp.duration}</span>}
                </div>
              </div>
              <span className="text-xs text-gray-400">{exp.month}</span>
            </div>
            {exp.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{exp.description}</p>}
            {exp.lessonLearned && (
              <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">บทเรียน</div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{exp.lessonLearned}</p>
              </div>
            )}
            {exp.willContinue !== null && exp.willContinue !== undefined && (
              <div className="mt-2 text-xs">
                {exp.willContinue ? (
                  <span className="text-green-600 dark:text-green-400">ทำต่อ</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">หยุด</span>
                )}
              </div>
            )}
            <div className="mt-2 text-xs text-gray-400">โดย {exp.createdBy.firstName} {exp.createdBy.lastName}</div>
          </div>
        ))}
        {experiments.length === 0 && <p className="text-center py-8 text-gray-400">ยังไม่มีการทดลอง — กดปุ่มด้านบนเพื่อเพิ่ม</p>}
      </div>
    </div>
  )
}
