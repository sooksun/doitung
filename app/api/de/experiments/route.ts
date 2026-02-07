import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

const createExperimentSchema = z.object({
  schoolId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)'),
  title: z.string().min(1, 'กรุณากรอกชื่อการทดลอง'),
  description: z.string().optional(),
  domain: z.string().optional(),
  duration: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED']).optional(),
  lessonLearned: z.string().optional(),
  willContinue: z.boolean().optional(),
})

// GET /api/de/experiments
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
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (schoolId) where.schoolId = schoolId
    if (month) where.month = month
    if (status) where.status = status

    const experiments = await prisma.experiment.findMany({
      where,
      include: {
        school: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json<APIResponse>({ success: true, data: experiments })
  } catch (error) {
    console.error('Get experiments error:', error)
    return NextResponse.json<APIResponse>({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// POST /api/de/experiments
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
    const validation = createExperimentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data
    const experiment = await prisma.experiment.create({
      data: {
        schoolId: data.schoolId,
        month: data.month,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        domain: data.domain || null,
        duration: data.duration || null,
        status: data.status || 'PLANNED',
        lessonLearned: data.lessonLearned?.trim() || null,
        willContinue: data.willContinue ?? null,
        createdById: decoded.userId,
      },
      include: {
        school: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json<APIResponse>(
      { success: true, message: 'บันทึกการทดลองเรียบร้อย', data: experiment },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create experiment error:', error)
    return NextResponse.json<APIResponse>({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
