import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

const createSessionSchema = z.object({
  schoolId: z.string().min(1),
  sessionDate: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)'),
  participants: z.number().min(1).optional(),
  deQuestionUsed: z.string().optional(),
  keyInsight: z.string().optional(),
  safetyLevel: z.number().min(1).max(5).optional(),
  questionDepth: z.number().min(1).max(5).optional(),
  studentConnection: z.number().min(1).max(5).optional(),
  actionFollowUp: z.number().min(1).max(5).optional(),
  deeperThinking: z.boolean().optional(),
  nextTry: z.string().optional(),
})

// GET /api/de/plc-sessions
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

    const sessions = await prisma.pLCSession.findMany({
      where,
      include: {
        school: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ sessionDate: 'desc' }],
    })

    return NextResponse.json<APIResponse>({ success: true, data: sessions })
  } catch (error) {
    console.error('Get PLC sessions error:', error)
    return NextResponse.json<APIResponse>({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// POST /api/de/plc-sessions
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
    const validation = createSessionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data
    const session = await prisma.pLCSession.create({
      data: {
        schoolId: data.schoolId,
        sessionDate: new Date(data.sessionDate),
        month: data.month,
        participants: data.participants || 0,
        deQuestionUsed: data.deQuestionUsed?.trim() || null,
        keyInsight: data.keyInsight?.trim() || null,
        safetyLevel: data.safetyLevel || null,
        questionDepth: data.questionDepth || null,
        studentConnection: data.studentConnection || null,
        actionFollowUp: data.actionFollowUp || null,
        deeperThinking: data.deeperThinking ?? null,
        nextTry: data.nextTry?.trim() || null,
        createdById: decoded.userId,
      },
      include: {
        school: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json<APIResponse>(
      { success: true, message: 'บันทึก PLC Session เรียบร้อย', data: session },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create PLC session error:', error)
    return NextResponse.json<APIResponse>({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
