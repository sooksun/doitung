'use client'

import { useEffect, useState } from 'react'

interface LearningLog {
  id: string; month: string; source: string; content: string; domain?: string
  createdBy: { firstName: string; lastName: string }
}

const sourceColors: Record<string, string> = {
  PLC: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SUPERVISION: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  EXPERIMENT: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

const sourceLabels: Record<string, string> = {
  PLC: 'PLC', SUPERVISION: 'นิเทศ', EXPERIMENT: 'ทดลอง', OTHER: 'อื่น ๆ',
}

export default function LearningTimelinePage() {
  const [logs, setLogs] = useState<LearningLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState({ month: '', source: 'PLC', content: '', domain: '' })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/de/learning-logs', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (json.success) setLogs(json.data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const res = await fetch('/api/de/learning-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ schoolId: user.schoolId, ...form }),
    })
    const json = await res.json()
    if (json.success) {
      setShowForm(false)
      setForm({ month: '', source: 'PLC', content: '', domain: '' })
      fetchData()
    }
  }

  const filtered = filter ? logs.filter((l) => l.source === filter) : logs
  const grouped = filtered.reduce<Record<string, LearningLog[]>>((acc, log) => {
    if (!acc[log.month]) acc[log.month] = []
    acc[log.month].push(log)
    return acc
  }, {})

  if (loading) return <div className="text-center py-12 text-gray-500">กำลังโหลด...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Learning Timeline</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
          {showForm ? 'ยกเลิก' : '+ เพิ่มบทเรียน'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'PLC', 'SUPERVISION', 'EXPERIMENT', 'OTHER'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === s ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            {s ? sourceLabels[s] : 'ทั้งหมด'}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เดือน (YYYY-MM)</label>
              <input value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} placeholder="2568-06" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">แหล่งที่มา</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white">
                {Object.entries(sourceLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">สิ่งที่เรียนรู้</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" required />
          </div>
          <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">บันทึก</button>
        </form>
      )}

      {/* Timeline */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([month, items]) => (
          <div key={month}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">{month}</h2>
            </div>
            <div className="ml-6 border-l-2 border-purple-200 dark:border-purple-800 pl-4 space-y-3">
              {items.map((log) => (
                <div key={log.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{log.content}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ml-2 whitespace-nowrap ${sourceColors[log.source]}`}>
                      {sourceLabels[log.source]}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2 text-xs text-gray-400">
                    {log.domain && <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{log.domain}</span>}
                    <span>{log.createdBy.firstName} {log.createdBy.lastName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-gray-400">ยังไม่มีบทเรียน — กดปุ่มด้านบนเพื่อเพิ่ม</p>}
      </div>
    </div>
  )
}
