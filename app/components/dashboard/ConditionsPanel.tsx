'use client'

import { useState, useCallback } from 'react'
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
  const [aiLoading, setAiLoading] = useState<'transform' | 'questions' | 'summary' | 'plc' | null>(null)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [showSummary, setShowSummary] = useState(false)
  const [summaryData, setSummaryData] = useState<{ supporters: string; blockers: string; suggest: string } | null>(null)
  const [showPlcPick, setShowPlcPick] = useState(false)
  const [plcPickData, setPlcPickData] = useState<{ supporter?: string; blocker?: string; questions: string[] } | null>(null)
  const [blameSuggestion, setBlameSuggestion] = useState<string | null>(null)

  const supporters = conditions.filter((c) => c.type === 'supporter')
  const blockers = conditions.filter((c) => c.type === 'blocker')

  const callCoPilot = useCallback(async (action: string, payload: Record<string, unknown>) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return null
    const res = await fetch('/api/ai/de-co-pilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, payload }),
    })
    const data = await res.json()
    return data.success ? data.data : null
  }, [])

  const openForm = (type: 'SUPPORTER' | 'BLOCKER') => {
    setFormType(type)
    setForm({ signalText: '', impactText: '', reflectionNote: '' })
    setSuggestedQuestions([])
    setBlameSuggestion(null)
    setShowForm(true)
  }

  const handleAiTransform = async () => {
    const raw = form.signalText.trim() || form.impactText.trim()
    if (!raw) return
    setAiLoading('transform')
    try {
      const data = await callCoPilot('transform', { raw, type: formType })
      if (data?.signalText != null) {
        setForm((prev) => ({
          ...prev,
          signalText: data.signalText || prev.signalText,
          impactText: data.impactText || prev.impactText,
          reflectionNote: data.reflectionNote || prev.reflectionNote,
        }))
      }
    } finally {
      setAiLoading(null)
    }
  }

  const handleAiQuestions = async () => {
    setAiLoading('questions')
    try {
      const data = await callCoPilot('questions', {
        signalText: form.signalText,
        impactText: form.impactText,
      })
      if (data?.questions?.length) setSuggestedQuestions(data.questions)
    } finally {
      setAiLoading(null)
    }
  }

  const handleAiSummary = async () => {
    setAiLoading('summary')
    try {
      const payload = conditions.map((c) => ({
        type: c.type === 'supporter' ? 'SUPPORTER' : 'BLOCKER',
        signalText: c.signalText,
        impactText: c.impactText,
        description: c.description,
      }))
      const data = await callCoPilot('summary-month', { conditions: payload })
      if (data) {
        setSummaryData(data)
        setShowSummary(true)
      }
    } finally {
      setAiLoading(null)
    }
  }

  const handlePlcPick = async () => {
    setAiLoading('plc')
    try {
      const payload = conditions.map((c) => ({
        type: c.type === 'supporter' ? 'SUPPORTER' : 'BLOCKER',
        signalText: c.signalText,
        impactText: c.impactText,
        description: c.description,
      }))
      const data = await callCoPilot('plc-pick', { conditions: payload })
      if (data) {
        setPlcPickData(data)
        setShowPlcPick(true)
      }
    } finally {
      setAiLoading(null)
    }
  }

  const checkBlameOnBlur = useCallback(async (text: string) => {
    if (!text.trim()) return
    const data = await callCoPilot('check-blame', { text })
    if (data?.isRisky && data?.suggestion) setBlameSuggestion(data.suggestion)
    else setBlameSuggestion(null)
  }, [callCoPilot])
  const applyBlameSuggestion = () => {
    if (blameSuggestion) setForm((prev) => ({ ...prev, impactText: prev.impactText || blameSuggestion }))
    setBlameSuggestion(null)
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

      {/* DE-PLC Co-Pilot: ปุ่ม AI ในฟอร์มเดียว */}
      {showForm && assessmentId && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {formType === 'SUPPORTER' ? '➕ บันทึกสิ่งที่หนุน' : '⚠ บันทึกสิ่งที่ถ่วง'}
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={handleAiTransform}
              disabled={aiLoading !== null || (!form.signalText.trim() && !form.impactText.trim())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium hover:bg-primary-200 dark:hover:bg-primary-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading === 'transform' ? (
                <span className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full" />
              ) : (
                '✨'
              )}
              ช่วยเขียนแบบ DE
            </button>
            <button
              type="button"
              onClick={handleAiQuestions}
              disabled={aiLoading !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 text-sm font-medium hover:bg-secondary-200 dark:hover:bg-secondary-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading === 'questions' ? (
                <span className="animate-spin w-4 h-4 border-2 border-secondary-500 border-t-transparent rounded-full" />
              ) : (
                '❓'
              )}
              ช่วยตั้งคำถามพัฒนา
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                สิ่งที่เกิดขึ้น <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.signalText}
                onChange={(e) => setForm({ ...form, signalText: e.target.value })}
                onBlur={(e) => checkBlameOnBlur(e.target.value)}
                placeholder="เล่าให้เพื่อนฟังได้ เช่น: ผู้บริหารปรับตารางงาน ลดภาระเอกสารช่วง PLC"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                rows={2}
              />
            </div>
            {blameSuggestion && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">{blameSuggestion}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={applyBlameSuggestion} className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline">
                    ใช้คำแนะนำ
                  </button>
                  <button type="button" onClick={() => setBlameSuggestion(null)} className="text-sm text-gray-500 hover:underline">
                    ปิด
                  </button>
                </div>
              </div>
            )}
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
              {suggestedQuestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, reflectionNote: prev.reflectionNote ? `${prev.reflectionNote} ${q}` : q }))}
                      className="px-2.5 py-1 rounded-md bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 text-xs hover:bg-secondary-200 dark:hover:bg-secondary-800/50"
                    >
                      + {q}
                    </button>
                  ))}
                </div>
              )}
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

      {/* DE Co-Pilot: สรุปสัญญาณ / เลือกประเด็น PLC */}
      {conditions.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAiSummary}
            disabled={aiLoading !== null}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiLoading === 'summary' ? (
              <span className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full" />
            ) : (
              '🧠'
            )}
            สรุปสัญญาณเดือนนี้
          </button>
          <button
            type="button"
            onClick={handlePlcPick}
            disabled={aiLoading !== null}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiLoading === 'plc' ? (
              <span className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
            ) : (
              '🎯'
            )}
            ช่วยเลือกประเด็นคุย PLC
          </button>
        </div>
      )}

      {showSummary && summaryData && (
        <div className="mt-4 p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
          <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-2">🧠 สรุปสัญญาณเดือนนี้</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">{summaryData.supporters}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{summaryData.blockers}</p>
          <p className="text-xs text-purple-600 dark:text-purple-400">{summaryData.suggest}</p>
          <button type="button" onClick={() => setShowSummary(false)} className="mt-2 text-sm text-purple-600 dark:text-purple-400 hover:underline">
            ปิด
          </button>
        </div>
      )}

      {showPlcPick && plcPickData && (
        <div className="mt-4 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
          <h4 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 mb-2">🎯 ประเด็นคุย PLC เดือนนี้</h4>
          {plcPickData.supporter && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
              <span className="font-medium text-green-700 dark:text-green-400">ขยายผล:</span> {plcPickData.supporter}
            </p>
          )}
          {plcPickData.blocker && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              <span className="font-medium text-orange-700 dark:text-orange-400">ออกแบบแก้:</span> {plcPickData.blocker}
            </p>
          )}
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">คำถาม DE สำหรับวง:</p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside space-y-0.5">
            {plcPickData.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
          <button type="button" onClick={() => setShowPlcPick(false)} className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            ปิด
          </button>
        </div>
      )}

      <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <span className="font-semibold">ใช้ข้อมูลนี้:</span> เปิดวง PLC เลือก 1 หนุน + 1 ถ่วง มาคุย · ผู้บริหารดู pattern ว่าถ่วงเพราะอะไรซ้ำ ๆ · โรงเรียน–เขต–มูลนิธิแม่ฟ้าหลวง ใช้เป็นฐานออกแบบการหนุนเสริมร่วมกัน
        </p>
      </div>
    </div>
  )
}
