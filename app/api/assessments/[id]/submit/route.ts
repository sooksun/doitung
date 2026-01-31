import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse, Assessment } from '@/lib/types'
import { AssessmentStatus } from '@prisma/client'

// POST /api/assessments/[id]/submit - Submit assessment
export async function POST(
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

    // Get assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        responses: true,
      },
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
          { success: false, message: 'คุณไม่มีสิทธิ์ส่งการประเมินนี้' },
          { status: 403 }
        )
      }
    }

    // Check if already submitted
    if (assessment.status === AssessmentStatus.SUBMITTED) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'การประเมินนี้ถูกส่งแล้ว' },
        { status: 400 }
      )
    }

    // Get total indicators count
    const totalIndicators = await prisma.indicator.count()

    // Check if all indicators are answered
    if (assessment.responses.length < totalIndicators) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          message: `กรุณาตอบคำถามให้ครบทั้ง ${totalIndicators} ข้อ (ตอบแล้ว ${assessment.responses.length} ข้อ)`,
        },
        { status: 400 }
      )
    }

    // Update assessment status to SUBMITTED
    const updatedAssessment = await prisma.assessment.update({
      where: { id },
      data: {
        status: AssessmentStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: {
        school: true,
        academicYear: true,
        semester: true,
        createdBy: true,
        responses: {
          include: {
            indicator: true,
            evidence: true,
          },
        },
      },
    })

    return NextResponse.json<APIResponse<{ assessment: Assessment }>>(
      {
        success: true,
        message: 'ส่งการประเมินสำเร็จ',
        data: { assessment: updatedAssessment as Assessment },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Submit assessment error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการส่งการประเมิน' },
      { status: 500 }
    )
  }
}
