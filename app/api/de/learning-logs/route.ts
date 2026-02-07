import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

const createLogSchema = z.object({
  schoolId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)'),
  source: z.enum(['PLC', 'SUPERVISION', 'EXPERIMENT', 'OTHER']),
  content: z.string().min(1, 'กรุณากรอกสิ่งที่เรียนรู้'),
  domain: z.string().optional(),
})

// GET /api/de/learning-logs
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

    const logs = await prisma.learningLog.findMany({
      where,
      include: {
        school: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json<APIResponse>({ success: true, data: logs })
  } catch (error) {
    console.error('Get learning logs error:', error)
    return NextResponse.json<APIResponse>({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// POST /api/de/learning-logs
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
    const validation = createLogSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { schoolId, month, source, content, domain } = validation.data

    const log = await prisma.learningLog.create({
      data: {
        schoolId,
        month,
        source,
        content: content.trim(),
        domain: domain || null,
        createdById: decoded.userId,
      },
      include: {
        school: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json<APIResponse>(
      { success: true, message: 'บันทึกการเรียนรู้เรียบร้อย', data: log },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create learning log error:', error)
    return NextResponse.json<APIResponse>({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
