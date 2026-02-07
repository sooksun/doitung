'use client'

import { useEffect, useState } from 'react'

interface MonthlyReflection {
  id: string; month: string; systemReflection?: string
  continueItems?: string; stopItems?: string; expandItems?: string; nextSteps?: string
  createdBy: { firstName: string; lastName: string }
}

export default function MonthlyReflectionPage() {
  const [reflections, setReflections] = useState<MonthlyReflection[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ month: '', systemReflection: '', continueItems: '', stopItems: '', expandItems: '', nextSteps: '' })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/de/monthly-reflection', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (json.success) setReflections(json.data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('accessToken')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const res = await fetch('/api/de/monthly-reflection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ schoolId: user.schoolId, ...form }),
    })
    const json = await res.json()
    if (json.success) {
      setEditing(false)
      setForm({ month: '', systemReflection: '', continueItems: '', stopItems: '', expandItems: '', nextSteps: '' })
      fetchData()
    }
  }

  const editReflection = (r: MonthlyReflection) => {
    setForm({
      month: r.month,
      systemReflection: r.systemReflection || '',
      continueItems: r.continueItems || '',
      stopItems: r.stopItems || '',
      expandItems: r.expandItems || '',
      nextSteps: r.nextSteps || '',
    })
    setEditing(true)
  }

  if (loading) return <div className="text-center py-12 text-gray-500">กำลังโหลด...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Monthly Reflection</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">เดือนนี้เราเรียนรู้อะไรเกี่ยวกับ &quot;ระบบ&quot; ของโรงเรียน — Continue / Stop / Expand</p>
        </div>
        <button onClick={() => { setEditing(!editing); if (editing) setForm({ month: '', systemReflection: '', continueItems: '', stopItems: '', expandItems: '', nextSteps: '' }) }} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700">
          {editing ? 'ยกเลิก' : '+ Reflection ใหม่'}
        </button>
      </div>

      {/* Form */}
      {editing && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-violet-200 dark:border-violet-800 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เดือน (YYYY-MM)</label>
            <input value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} placeholder="2568-06" className="w-full max-w-xs rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เราเรียนรู้อะไรเกี่ยวกับระบบของโรงเรียน</label>
            <textarea value={form.systemReflection} onChange={(e) => setForm({ ...form, systemReflection: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-green-700 dark:text-green-400 mb-1">ทำต่อ (Continue)</label>
              <textarea value={form.continueItems} onChange={(e) => setForm({ ...form, continueItems: e.target.value })} rows={3} className="w-full rounded-lg border border-green-300 dark:border-green-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-red-700 dark:text-red-400 mb-1">หยุด (Stop)</label>
              <textarea value={form.stopItems} onChange={(e) => setForm({ ...form, stopItems: e.target.value })} rows={3} className="w-full rounded-lg border border-red-300 dark:border-red-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">ขยาย (Expand)</label>
              <textarea value={form.expandItems} onChange={(e) => setForm({ ...form, expandItems: e.target.value })} rows={3} className="w-full rounded-lg border border-blue-300 dark:border-blue-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ก้าวถัดไปเล็ก ๆ</label>
            <textarea value={form.nextSteps} onChange={(e) => setForm({ ...form, nextSteps: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <button type="submit" className="px-6 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700">บันทึก</button>
        </form>
      )}

      {/* Reflections List */}
      <div className="space-y-4">
        {reflections.map((r) => (
          <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-violet-700 dark:text-violet-400">{r.month}</h3>
              <button onClick={() => editReflection(r)} className="text-xs text-violet-600 dark:text-violet-400 hover:underline">แก้ไข</button>
            </div>
            {r.systemReflection && (
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3 mb-3">
                <div className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-1">เรียนรู้เกี่ยวกับระบบ</div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{r.systemReflection}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {r.continueItems && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">ทำต่อ</div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{r.continueItems}</p>
                </div>
              )}
              {r.stopItems && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">หยุด</div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{r.stopItems}</p>
                </div>
              )}
              {r.expandItems && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">ขยาย</div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{r.expandItems}</p>
                </div>
              )}
            </div>
            {r.nextSteps && (
              <div className="mt-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">ก้าวถัดไป</div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{r.nextSteps}</p>
              </div>
            )}
            <div className="mt-2 text-xs text-gray-400">โดย {r.createdBy.firstName} {r.createdBy.lastName}</div>
          </div>
        ))}
        {reflections.length === 0 && <p className="text-center py-8 text-gray-400">ยังไม่มี Reflection — กดปุ่มด้านบนเพื่อเพิ่ม</p>}
      </div>
    </div>
  )
}
