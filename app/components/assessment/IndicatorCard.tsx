'use client'

import { useState } from 'react'
import RadioGroup from './RadioGroup'
import NoteInput from './NoteInput'

interface IndicatorCardProps {
  indicator: {
    id: string
    code: string
    title: string
    orderNo: number
  }
  response?: {
    score: number
    note?: string | null
  }
  onChange: (indicatorId: string, score: number, note: string) => void
  disabled?: boolean
}

export default function IndicatorCard({ 
  indicator, 
  response, 
  onChange, 
  disabled = false 
}: IndicatorCardProps) {
  const [score, setScore] = useState<number | null>(response?.score || null)
  const [note, setNote] = useState(response?.note || '')
  const [showNote, setShowNote] = useState(!!response?.note)

  const handleScoreChange = (newScore: number) => {
    setScore(newScore)
    onChange(indicator.id, newScore, note)
  }

  const handleNoteChange = (newNote: string) => {
    setNote(newNote)
    if (score) {
      onChange(indicator.id, score, newNote)
    }
  }

  return (
    <div className={`
      bg-white rounded-lg border-2 p-6 transition-all
      ${score ? 'border-primary-200 shadow-md' : 'border-gray-200'}
      ${disabled ? 'opacity-60' : ''}
    `}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
              {indicator.code}
            </span>
            {score && (
              <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                ✓ ตอบแล้ว
              </span>
            )}
          </div>
          <h3 className="text-base font-medium text-gray-900 leading-relaxed">
            {indicator.title}
          </h3>
        </div>
      </div>

      {/* Radio Group */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">
            ระดับคะแนน:
          </span>
          <div className="text-xs text-gray-500 space-x-4">
            <span>1 = น้อยที่สุด</span>
            <span>5 = มากที่สุด</span>
          </div>
        </div>
        <RadioGroup
          value={score}
          onChange={handleScoreChange}
          disabled={disabled}
        />
      </div>

      {/* Note Section */}
      <div className="pt-4 border-t border-gray-200">
        {!showNote ? (
          <button
            onClick={() => setShowNote(true)}
            disabled={disabled}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มหมายเหตุ
          </button>
        ) : (
          <div className="space-y-2">
            <NoteInput
              value={note}
              onChange={handleNoteChange}
              disabled={disabled}
            />
            <button
              onClick={() => {
                setShowNote(false)
                setNote('')
                if (score) {
                  onChange(indicator.id, score, '')
                }
              }}
              disabled={disabled}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              ลบหมายเหตุ
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
