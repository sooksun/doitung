'use client'

import { useState, useRef } from 'react'
import { EvidenceFile } from '@/lib/types'
import { confirmAction } from '@/lib/toast'

interface EvidenceUploadProps {
  responseId: string
  existingFiles?: EvidenceFile[]
  onUploadSuccess?: (file: EvidenceFile) => void
  onDeleteSuccess?: (fileId: string) => void
  disabled?: boolean
}

export default function EvidenceUpload({
  responseId,
  existingFiles = [],
  onUploadSuccess,
  onDeleteSuccess,
  disabled = false,
}: EvidenceUploadProps) {
  const [files, setFiles] = useState<EvidenceFile[]>(existingFiles)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setError('')

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('ไฟล์มีขนาดใหญ่เกิน 10MB')
      return
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('ประเภทไฟล์ไม่ถูกต้อง (รองรับเฉพาะ รูปภาพ, PDF, Word, Excel)')
      return
    }

    await uploadFile(selectedFile)
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    setError('')

    try {
      const token = localStorage.getItem('accessToken')
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('responseId', responseId)

      const response = await fetch('/api/evidence/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        const newFile = data.data.evidence
        setFiles([...files, newFile])
        onUploadSuccess?.(newFile)
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileId: string) => {
    const confirmed = await confirmAction('คุณต้องการลบไฟล์นี้หรือไม่?', 'ยืนยันการลบไฟล์')
    if (!confirmed) return

    try {
      const token = localStorage.getItem('accessToken')
      
      const response = await fetch(`/api/evidence/${fileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setFiles(files.filter(f => f.id !== fileId))
        onDeleteSuccess?.(fileId)
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการลบไฟล์')
      }
    } catch (error) {
      console.error('Delete error:', error)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType === 'application/pdf') return '📄'
    if (mimeType.includes('word')) return '📝'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
    return '📎'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          แนบหลักฐาน (ถ้ามี)
        </label>
        <span className="text-xs text-gray-500">
          รองรับ: รูปภาพ, PDF, Word, Excel (สูงสุด 10MB)
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Upload Button */}
      {!disabled && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || disabled}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-gray-600 hover:text-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                กำลังอัปโหลด...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                เลือกไฟล์เพื่ออัปโหลด
              </span>
            )}
          </button>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.originalName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.fileSize)} • {new Date(file.uploadedAt).toLocaleDateString('th-TH')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <a
                  href={file.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                  title="ดูไฟล์"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </a>
                {!disabled && (
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="ลบไฟล์"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
