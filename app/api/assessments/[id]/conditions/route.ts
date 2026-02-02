import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

const createConditionSchema = z.object({
  type: z.enum(['SUPPORTER', 'BLOCKER']),
  description: z.string().min(1, 'กรุณาระบุรายละเอียด'),
  category: z.string().optional(),
})

// POST /api/assessments/[id]/conditions - Add condition
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params
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

    const body = await request.json()
    const validationResult = createConditionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { type, description, category } = validationResult.data

    // Check if user has permission
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { createdById: true, schoolId: true },
    })

    if (!assessment) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่พบแบบประเมิน' },
        { status: 404 }
      )
    }

    if (
      decoded.role !== 'ADMIN' &&
      assessment.createdById !== decoded.userId &&
      assessment.schoolId !== decoded.schoolId
    ) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'คุณไม่มีสิทธิ์เพิ่มข้อมูลนี้' },
        { status: 403 }
      )
    }

    const condition = await prisma.developmentCondition.create({
      data: {
        assessmentId,
        type,
        description,
        category: category || null,
      },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'เพิ่มเงื่อนไขเรียบร้อย',
        data: { condition },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Add condition error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มเงื่อนไข' },
      { status: 500 }
    )
  }
}
