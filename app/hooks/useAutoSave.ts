import { useEffect, useRef, useCallback } from 'react'
import { AssessmentResponseInput } from '@/lib/types'

interface UseAutoSaveOptions {
  assessmentId: string
  responses: AssessmentResponseInput[]
  onSave?: (success: boolean) => void
  interval?: number // milliseconds, default 30000 (30 seconds)
  enabled?: boolean
}

export function useAutoSave({
  assessmentId,
  responses,
  onSave,
  interval = 30000,
  enabled = true,
}: UseAutoSaveOptions) {
  const intervalRef = useRef<NodeJS.Timeout>()
  const lastSavedRef = useRef<string>('')

  const save = useCallback(async () => {
    if (!enabled || responses.length === 0) return

    // Normalize responses: convert null to 0 for score, keep desiredScore as is
    const normalizedResponses = responses.map(r => ({
      ...r,
      score: r.score ?? 0,
      desiredScore: r.desiredScore ?? 0,
      note: r.note || '',
    }))

    // Check if data has changed
    const currentData = JSON.stringify(normalizedResponses)
    if (currentData === lastSavedRef.current) {
      return // No changes, skip save
    }

    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        console.warn('Auto-save: No access token found')
        onSave?.(false)
        return
      }

      const response = await fetch('/api/assessments/auto-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assessmentId,
          responses: normalizedResponses,
        }),
      })

      const data = await response.json()

      if (data.success) {
        lastSavedRef.current = currentData
        onSave?.(true)
      } else {
        console.warn('Auto-save failed:', data.message)
        onSave?.(false)
      }
    } catch (error) {
      console.warn('Auto-save error:', error)
      onSave?.(false)
    }
  }, [assessmentId, responses, enabled, onSave])

  // Setup auto-save interval
  useEffect(() => {
    if (!enabled) return

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Set new interval
    intervalRef.current = setInterval(save, interval)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [save, interval, enabled])

  // Save on unmount
  useEffect(() => {
    return () => {
      save()
    }
  }, [save])

  return {
    save, // Manual save function
  }
}
