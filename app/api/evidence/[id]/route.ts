import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

// DELETE /api/evidence/[id] - Delete evidence file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Get evidence
    const evidence = await prisma.evidence.findUnique({
      where: { id },
      include: {
        response: {
          include: {
            assessment: true,
          },
        },
      },
    })

    if (!evidence) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่พบไฟล์หลักฐาน' },
        { status: 404 }
      )
    }

    // Check permission
    if (decoded.role === 'SCHOOL_DIRECTOR' || decoded.role === 'TEACHER') {
      if (decoded.schoolId !== evidence.response.assessment.schoolId) {
        return NextResponse.json<APIResponse>(
          { success: false, message: 'คุณไม่มีสิทธิ์ลบไฟล์นี้' },
          { status: 403 }
        )
      }
    }

    // Delete file from filesystem
    const filePath = path.join(process.cwd(), 'public', evidence.filePath)
    try {
      await unlink(filePath)
    } catch (error) {
      console.error('Error deleting file:', error)
      // Continue to delete from database even if file deletion fails
    }

    // Delete from database
    await prisma.evidence.delete({
      where: { id },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'ลบไฟล์หลักฐานสำเร็จ',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete evidence error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการลบไฟล์หลักฐาน' },
      { status: 500 }
    )
  }
}
