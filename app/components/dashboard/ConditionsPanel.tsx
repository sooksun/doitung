'use client'

import { useState } from 'react'
import { DevelopmentCondition } from '@/lib/types'

interface ConditionsPanelProps {
  conditions?: DevelopmentCondition[]
  assessmentId?: string
  onUpdate?: () => void
  editable?: boolean
}

function formatConditionDisplay(c: DevelopmentCondition): { main: string; sub?: string } {
  if (c.signalText && c.impactText) {
    const main = `${c.signalText} → ${c.impactText}`
    const sub = c.reflectionNote?.trim() || undefined
    return { main, sub }
  }
  return { main: c.description || '—' }
}

export default function ConditionsPanel({
  conditions = [],
  assessmentId,
  onUpdate,
  editable = true,
}: ConditionsPanelProps) {
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<'SUPPORTER' | 'BLOCKER'>('SUPPORTER')
  const [form, setForm] = useState({
    signalText: '',
    impactText: '',
    reflectionNote: '',
  })

  const supporters = conditions.filter((c) => c.type === 'supporter')
  const blockers = conditions.filter((c) => c.type === 'blocker')

  const openForm = (type: 'SUPPORTER' | 'BLOCKER') => {
    setFormType(type)
    setForm({ signalText: '', impactText: '', reflectionNote: '' })
    setShowForm(true)
  }

  const handleAdd = async () => {
    if (!form.signalText.trim() || !form.impactText.trim() || !assessmentId) return

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/assessments/${assessmentId}/conditions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: formType,
          signalText: form.signalText.trim(),
          impactText: form.impactText.trim(),
          reflectionNote: form.reflectionNote.trim() || undefined,
        }),
      })

      if (res.ok) {
        setForm({ signalText: '', impactText: '', reflectionNote: '' })
        setShowForm(false)
        onUpdate?.()
      } else {
        const data = await res.json()
        alert(data.message || 'บันทึกไม่สำเร็จ')
      }
    } catch (err) {
      console.error('Add condition error:', err)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        สิ่งที่หนุน / สิ่งที่ถ่วง
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        ข้อมูลเชิงระบบเพื่อออกแบบการหนุนเสริมร่วมกัน — สิ่งนี้หนุนหรือถ่วงอะไร และส่งผลต่อการพัฒนาอย่างไร
      </p>

      {showForm && assessmentId && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {formType === 'SUPPORTER' ? '➕ บันทึกสิ่งที่หนุน' : '⚠ บันทึกสิ่งที่ถ่วง'}
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                สิ่งที่เกิดขึ้น <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.signalText}
                onChange={(e) => setForm({ ...form, signalText: e.target.value })}
                placeholder="เล่าให้เพื่อนฟังได้ เช่น: ผู้บริหารปรับตารางงาน ลดภาระเอกสารช่วง PLC"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ส่งผลต่อการพัฒนาอย่างไร <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.impactText}
                onChange={(e) => setForm({ ...form, impactText: e.target.value })}
                placeholder="เช่น: ครูมีเวลาแลกเปลี่ยนชิ้นงานผู้เรียนจริง → PLC เริ่มตั้งคำถามเชิงลึกมากขึ้น"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ข้อสังเกต / คำถามเพื่อการพัฒนา <span className="text-gray-400">(ไม่บังคับ)</span>
              </label>
              <input
                type="text"
                value={form.reflectionNote}
                onChange={(e) => setForm({ ...form, reflectionNote: e.target.value })}
                placeholder="ข้อสังเกตเชิง DE"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} className="btn-primary px-4 py-2 text-sm">
                บันทึกสัญญาณ
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
          {supporters.length === 0 ? (
            <div className="space-y-2">
              {editable && assessmentId && !showForm && (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    บันทึกสัญญาณที่หนุนการพัฒนา (ไม่ใช่ข้ออ้าง)
                  </p>
                  <button
                    onClick={() => openForm('SUPPORTER')}
                    className="w-full py-3 px-4 rounded-lg border-2 border-dashed border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 font-medium text-sm transition-colors"
                  >
                    + บันทึกสิ่งที่หนุน
                  </button>
                </>
              )}
              {(!editable || !assessmentId) && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">ยังไม่มีข้อมูล</p>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {supporters.map((s) => {
                const { main, sub } = formatConditionDisplay(s)
                return (
                  <li
                    key={s.id}
                    className="text-sm pl-4 border-l-2 border-green-500 py-1"
                  >
                    <span className="text-gray-700 dark:text-gray-300">{main}</span>
                    {sub && (
                      <p className="mt-1 text-gray-500 dark:text-gray-400 text-xs">→ {sub}</p>
                    )}
                  </li>
                )
              })}
              {editable && assessmentId && !showForm && (
                <li>
                  <button
                    onClick={() => openForm('SUPPORTER')}
                    className="text-sm text-green-600 dark:text-green-400 hover:underline"
                  >
                    + เพิ่มสัญญาณที่หนุน
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* สิ่งที่ถ่วง */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚠</span>
            <h4 className="font-semibold text-orange-700 dark:text-orange-400">สิ่งที่ถ่วง</h4>
          </div>
          {blockers.length === 0 ? (
            <div className="space-y-2">
              {editable && assessmentId && !showForm && (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    บันทึกสัญญาณที่ถ่วง (เงื่อนไขระบบ ไม่ใช่ปัญหาคน)
                  </p>
                  <button
                    onClick={() => openForm('BLOCKER')}
                    className="w-full py-3 px-4 rounded-lg border-2 border-dashed border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 font-medium text-sm transition-colors"
                  >
                    + บันทึกสิ่งที่ถ่วง
                  </button>
                </>
              )}
              {(!editable || !assessmentId) && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">ยังไม่มีข้อมูล</p>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {blockers.map((b) => {
                const { main, sub } = formatConditionDisplay(b)
                return (
                  <li
                    key={b.id}
                    className="text-sm pl-4 border-l-2 border-orange-500 py-1"
                  >
                    <span className="text-gray-700 dark:text-gray-300">{main}</span>
                    {sub && (
                      <p className="mt-1 text-gray-500 dark:text-gray-400 text-xs">→ {sub}</p>
                    )}
                  </li>
                )
              })}
              {editable && assessmentId && !showForm && (
                <li>
                  <button
                    onClick={() => openForm('BLOCKER')}
                    className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    + เพิ่มสัญญาณที่ถ่วง
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <span className="font-semibold">ใช้ข้อมูลนี้:</span> เปิดวง PLC เลือก 1 หนุน + 1 ถ่วง มาคุย · ผู้บริหารดู pattern ว่าถ่วงเพราะอะไรซ้ำ ๆ · โรงเรียน–เขต–มูลนิธิแม่ฟ้าหลวง ใช้เป็นฐานออกแบบการหนุนเสริมร่วมกัน
        </p>
      </div>
    </div>
  )
}
