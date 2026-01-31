import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse, Assessment } from '@/lib/types'
import { AssessmentStatus } from '@prisma/client'

// GET /api/assessments/[id] - Get assessment detail
export async function GET(
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

    // Get assessment with all responses and indicators
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            year: true,
            name: true,
          },
        },
        semester: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        responses: {
          include: {
            indicator: {
              select: {
                id: true,
                code: true,
                title: true,
                groupId: true,
                orderNo: true,
                group: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    orderNo: true,
                  },
                },
              },
            },
            evidence: true,
          },
          orderBy: {
            indicator: {
              orderNo: 'asc',
            },
          },
        },
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
          { success: false, message: 'คุณไม่มีสิทธิ์เข้าถึงการประเมินนี้' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json<APIResponse<{ assessment: Assessment }>>(
      {
        success: true,
        data: { assessment: assessment as Assessment },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get assessment detail error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการประเมิน' },
      { status: 500 }
    )
  }
}

// PUT /api/assessments/[id] - Update assessment
const updateAssessmentSchema = z.object({
  responses: z.array(
    z.object({
      indicatorId: z.string(),
      score: z.number().min(1).max(5),
      note: z.string().optional(),
    })
  ),
})

export async function PUT(
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

    const body = await request.json()
    
    // Validate input
    const validationResult = updateAssessmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { responses } = validationResult.data

    // Get assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id },
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

    // Update responses (upsert)
    const updatePromises = responses.map((response) =>
      prisma.assessmentResponse.upsert({
        where: {
          assessmentId_indicatorId: {
            assessmentId: id,
            indicatorId: response.indicatorId,
          },
        },
        create: {
          assessmentId: id,
          indicatorId: response.indicatorId,
          score: response.score,
          note: response.note || null,
        },
        update: {
          score: response.score,
          note: response.note || null,
        },
      })
    )

    await Promise.all(updatePromises)

    // Update assessment status to IN_PROGRESS if still DRAFT
    if (assessment.status === AssessmentStatus.DRAFT) {
      await prisma.assessment.update({
        where: { id },
        data: { status: AssessmentStatus.IN_PROGRESS },
      })
    }

    // Get updated assessment
    const updatedAssessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        school: true,
        academicYear: true,
        semester: true,
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
        message: 'อัปเดตการประเมินสำเร็จ',
        data: { assessment: updatedAssessment as Assessment },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update assessment error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตการประเมิน' },
      { status: 500 }
    )
  }
}

// DELETE /api/assessments/[id] - Delete assessment
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

    // Get assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id },
    })

    if (!assessment) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่พบการประเมิน' },
        { status: 404 }
      )
    }

    // Check permission (only creator or admin can delete)
    if (
      decoded.role !== 'SUPER_ADMIN' &&
      decoded.role !== 'OFFICE_ADMIN' &&
      assessment.createdById !== decoded.userId
    ) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'คุณไม่มีสิทธิ์ลบการประเมินนี้' },
        { status: 403 }
      )
    }

    // Cannot delete submitted assessments
    if (assessment.status === AssessmentStatus.SUBMITTED) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่สามารถลบการประเมินที่ส่งแล้ว' },
        { status: 400 }
      )
    }

    // Delete assessment (cascade will delete responses and evidence)
    await prisma.assessment.delete({
      where: { id },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'ลบการประเมินสำเร็จ',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete assessment error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการลบการประเมิน' },
      { status: 500 }
    )
  }
}
