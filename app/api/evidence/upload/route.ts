import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

// POST /api/evidence/upload - Upload evidence file
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่พบ access token' },
        { status: 401 }
      )
    }

    const decoded = verifyAccessToken(token)
    if (!decoded) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'Access token ไม่ถูกต้องหรือหมดอายุ' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const responseId = formData.get('responseId') as string
    const description = formData.get('description') as string | null

    if (!file) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'กรุณาเลือกไฟล์' },
        { status: 400 }
      )
    }

    if (!responseId) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'กรุณาระบุ response ID' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไฟล์มีขนาดใหญ่เกิน 10MB' },
        { status: 400 }
      )
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

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ประเภทไฟล์ไม่ถูกต้อง (รองรับเฉพาะ รูปภาพ, PDF, Word, Excel)' },
        { status: 400 }
      )
    }

    // Check if response exists
    const response = await prisma.assessmentResponse.findUnique({
      where: { id: responseId },
      include: {
        assessment: true,
      },
    })

    if (!response) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่พบข้อมูลคำตอบ' },
        { status: 404 }
      )
    }

    // Check permission
    if (decoded.role === 'SCHOOL_DIRECTOR' || decoded.role === 'TEACHER') {
      if (decoded.schoolId !== response.assessment.schoolId) {
        return NextResponse.json<APIResponse>(
          { success: false, message: 'คุณไม่มีสิทธิ์อัปโหลดไฟล์สำหรับการประเมินนี้' },
          { status: 403 }
        )
      }
    }

    // Create upload directory if not exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'evidence')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const ext = path.extname(file.name)
    const fileName = `${timestamp}-${randomString}${ext}`
    const filePath = path.join(uploadDir, fileName)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Save to database
    const evidence = await prisma.evidence.create({
      data: {
        responseId,
        fileName,
        originalName: file.name,
        filePath: `/uploads/evidence/${fileName}`,
        fileSize: file.size,
        mimeType: file.type,
        description: description || null,
      },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'อัปโหลดไฟล์สำเร็จ',
        data: { evidence },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Upload evidence error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' },
      { status: 500 }
    )
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}
