import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'
import { AssessmentStatus } from '@prisma/client'

// POST /api/assessments/auto-save - Auto-save responses
const autoSaveSchema = z.object({
  assessmentId: z.string().min(1, 'กรุณาระบุ assessment ID'),
  responses: z.array(
    z.object({
      indicatorId: z.string(),
      score: z.number().min(0).max(5).nullable().default(0),        // null/0 = not answered yet, 1-5 = current state
      desiredScore: z.number().min(0).max(5).nullable().optional(),  // null/0 = not answered yet, 1-5 = desired state
      note: z.string().optional().nullable(),
    })
  ),
})

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

    const body = await request.json()
    
    // Validate input
    const validationResult = autoSaveSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { assessmentId, responses } = validationResult.data

    // Get assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    })

    if (!assessment) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่พบการประเมิน' },
        { status: 404 }
      )
    }

    // Check permission
    if (decoded.role === 'SCHOOL_DIRECTOR' || decoded.role === 'TEACHER') {
      if (decoded.schoolId !== assessment.schoolId) {
        return NextResponse.json<APIResponse>(
          { success: false, message: 'คุณไม่มีสิทธิ์แก้ไขการประเมินนี้' },
          { status: 403 }
        )
      }
    }

    // Check if assessment can be edited
    if (assessment.status === AssessmentStatus.SUBMITTED) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่สามารถแก้ไขการประเมินที่ส่งแล้ว' },
        { status: 400 }
      )
    }

    // Save responses (upsert) - only save if score > 0 (handle null as 0)
    const validResponses = responses.filter(r => (r.score ?? 0) > 0)
    const savePromises = validResponses.map((response) =>
      prisma.assessmentResponse.upsert({
        where: {
          assessmentId_indicatorId: {
            assessmentId,
            indicatorId: response.indicatorId,
          },
        },
        create: {
          assessmentId,
          indicatorId: response.indicatorId,
          score: response.score ?? 0,
          desiredScore: response.desiredScore ?? null,
          note: response.note ?? null,
        },
        update: {
          score: response.score ?? 0,
          desiredScore: response.desiredScore ?? null,
          note: response.note ?? null,
        },
      })
    )

    await Promise.all(savePromises)

    // Update assessment status to IN_PROGRESS if still DRAFT
    if (assessment.status === AssessmentStatus.DRAFT) {
      await prisma.assessment.update({
        where: { id: assessmentId },
        data: { status: AssessmentStatus.IN_PROGRESS },
      })
    }

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'บันทึกอัตโนมัติสำเร็จ',
        data: {
          savedAt: new Date().toISOString(),
          responsesCount: responses.length,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Auto-save error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการบันทึกอัตโนมัติ' },
      { status: 500 }
    )
  }
}
