import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

const createSignalSchema = z.object({
  schoolId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)'),
  studentCode: z.string().min(1, 'กรุณาระบุรหัสผู้เรียน'),
  signalDescription: z.string().min(1, 'กรุณากรอกสัญญาณที่เห็น'),
  changeDescription: z.string().optional(),
  teacherAction: z.string().optional(),
})

// GET /api/de/student-signals
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    if (!token) {
      return NextResponse.json<APIResponse>({ success: false, message: 'ไม่พบ access token' }, { status: 401 })
    }
    const decoded = verifyAccessToken(token)
    if (!decoded) {
      return NextResponse.json<APIResponse>({ success: false, message: 'Access token ไม่ถูกต้อง' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId') || decoded.schoolId
    const month = searchParams.get('month')

    const where: Record<string, unknown> = {}
    if (schoolId) where.schoolId = schoolId
    if (month) where.month = month

    const signals = await prisma.studentSignal.findMany({
      where,
      include: {
        school: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json<APIResponse>({ success: true, data: signals })
  } catch (error) {
    console.error('Get student signals error:', error)
    return NextResponse.json<APIResponse>({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// POST /api/de/student-signals
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    if (!token) {
      return NextResponse.json<APIResponse>({ success: false, message: 'ไม่พบ access token' }, { status: 401 })
    }
    const decoded = verifyAccessToken(token)
    if (!decoded) {
      return NextResponse.json<APIResponse>({ success: false, message: 'Access token ไม่ถูกต้อง' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createSignalSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { schoolId, month, studentCode, signalDescription, changeDescription, teacherAction } = validation.data

    const signal = await prisma.studentSignal.create({
      data: {
        schoolId,
        month,
        studentCode: studentCode.trim(),
        signalDescription: signalDescription.trim(),
        changeDescription: changeDescription?.trim() || null,
        teacherAction: teacherAction?.trim() || null,
        createdById: decoded.userId,
      },
      include: {
        school: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json<APIResponse>(
      { success: true, message: 'บันทึกสัญญาณผู้เรียนเรียบร้อย', data: signal },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create student signal error:', error)
    return NextResponse.json<APIResponse>({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
