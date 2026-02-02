'use client'

import { useState } from 'react'
import { DevelopmentCondition } from '@/lib/types'

interface ConditionsPanelProps {
  conditions?: DevelopmentCondition[]
  assessmentId?: string
  onUpdate?: () => void
  editable?: boolean
}

export default function ConditionsPanel({
  conditions = [],
  assessmentId,
  onUpdate,
  editable = false,
}: ConditionsPanelProps) {
  const [showForm, setShowForm] = useState(false)
  const [newCondition, setNewCondition] = useState({ type: 'SUPPORTER', description: '', category: '' })

  const supporters = conditions.filter((c) => c.type === 'supporter')
  const blockers = conditions.filter((c) => c.type === 'blocker')

  const handleAdd = async () => {
    if (!newCondition.description.trim() || !assessmentId) return

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/assessments/${assessmentId}/conditions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCondition),
      })

      if (res.ok) {
        setNewCondition({ type: 'SUPPORTER', description: '', category: '' })
        setShowForm(false)
        onUpdate?.()
      }
    } catch (err) {
      console.error('Add condition error:', err)
    }
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          เงื่อนไขที่หนุน / ถ่วง
        </h3>
        {editable && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            + เพิ่ม
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        สิ่งที่ส่งผลต่อการพัฒนาโรงเรียน (ระบบ ไม่ใช่คน)
      </p>

      {showForm && editable && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ประเภท
              </label>
              <select
                value={newCondition.type}
                onChange={(e) => setNewCondition({ ...newCondition, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
              >
                <option value="SUPPORTER">สิ่งที่หนุน</option>
                <option value="BLOCKER">สิ่งที่ถ่วง</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                รายละเอียด
              </label>
              <textarea
                value={newCondition.description}
                onChange={(e) => setNewCondition({ ...newCondition, description: e.target.value })}
                placeholder="เช่น: ผู้บริหารปกป้องเวลา PLC, งานเร่งจากภายนอก"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} className="btn-primary px-4 py-2 text-sm">
                บันทึก
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* สิ่งที่หนุน */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">✓</span>
            <h4 className="font-semibold text-green-700 dark:text-green-400">สิ่งที่หนุน</h4>
          </div>
          <ul className="space-y-2">
            {supporters.length === 0 ? (
              <li className="text-sm text-gray-500 dark:text-gray-400 italic">ยังไม่มีข้อมูล</li>
            ) : (
              supporters.map((s) => (
                <li
                  key={s.id}
                  className="text-sm text-gray-700 dark:text-gray-300 pl-4 border-l-2 border-green-500 py-1"
                >
                  • {s.description}
                </li>
              ))
            )}
          </ul>
        </div>

        {/* สิ่งที่ถ่วง */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚠</span>
            <h4 className="font-semibold text-orange-700 dark:text-orange-400">สิ่งที่ถ่วง</h4>
          </div>
          <ul className="space-y-2">
            {blockers.length === 0 ? (
              <li className="text-sm text-gray-500 dark:text-gray-400 italic">ยังไม่มีข้อมูล</li>
            ) : (
              blockers.map((b) => (
                <li
                  key={b.id}
                  className="text-sm text-gray-700 dark:text-gray-300 pl-4 border-l-2 border-orange-500 py-1"
                >
                  • {b.description}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <span className="font-semibold">หมายเหตุ DE:</span> ข้อมูลนี้มีค่ามากเวลาคุยกับเขต/กสศ. เพื่อออกแบบเงื่อนไขหนุนเสริมร่วมกัน
        </p>
      </div>
    </div>
  )
}
