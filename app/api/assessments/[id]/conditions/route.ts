import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

const DOMAINS = ['Leadership', 'PLC', 'Student', 'Data', 'Culture'] as const

const createConditionSchema = z.object({
  type: z.enum(['SUPPORTER', 'BLOCKER']),
  signalText: z.string().optional(),
  impactText: z.string().optional(),
  reflectionNote: z.string().optional(),
  domain: z.enum(DOMAINS).optional(),
  month: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
}).refine(
  (data) => {
    const hasDe = data.signalText?.trim() && data.impactText?.trim()
    const hasLegacy = data.description?.trim()
    return !!hasDe || !!hasLegacy
  },
  { message: 'กรุณากรอกสิ่งที่เกิดขึ้น และส่งผลต่อการพัฒนาอย่างไร' }
)

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

    const { type, signalText, impactText, reflectionNote, domain, month, description, category } = validationResult.data

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

    // Check permission: creator or same school can add conditions
    const isCreator = assessment.createdById === decoded.userId
    const isSameSchool = assessment.schoolId === decoded.schoolId

    if (!isCreator && !isSameSchool) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'คุณไม่มีสิทธิ์เพิ่มข้อมูลนี้' },
        { status: 403 }
      )
    }

    const condition = await prisma.developmentCondition.create({
      data: {
        assessmentId,
        type,
        signalText: signalText?.trim() || null,
        impactText: impactText?.trim() || null,
        reflectionNote: reflectionNote?.trim() || null,
        domain: domain || null,
        month: month || null,
        description: description?.trim() || null,
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
