import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

// GET /api/export/assessment/[id] - Get assessment data for export
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Get assessment with all details
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        school: true,
        academicYear: true,
        semester: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        responses: {
          include: {
            indicator: {
              include: {
                group: true,
              },
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
          { success: false, message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' },
          { status: 403 }
        )
      }
    }

    // Get all indicator groups for calculating domain scores
    const groups = await prisma.indicatorGroup.findMany({
      include: {
        indicators: true,
      },
      orderBy: {
        orderNo: 'asc',
      },
    })

    // Calculate domain scores
    const domainScores = groups.map((group) => {
      const groupResponses = assessment.responses.filter(
        (r) => r.indicator.groupId === group.id
      )
      const averageScore =
        groupResponses.length > 0
          ? groupResponses.reduce((sum, r) => sum + r.score, 0) / groupResponses.length
          : 0

      return {
        groupId: group.id,
        groupCode: group.code,
        groupName: group.name,
        groupNameEn: group.nameEn,
        averageScore: Math.round(averageScore * 100) / 100,
        totalIndicators: group.indicators.length,
        answeredIndicators: groupResponses.length,
        responses: groupResponses.map((r) => ({
          indicatorCode: r.indicator.code,
          indicatorTitle: r.indicator.title,
          score: r.score,
          note: r.note,
        })),
      }
    })

    const overallScore =
      domainScores.length > 0
        ? domainScores.reduce((sum, d) => sum + d.averageScore, 0) / domainScores.length
        : 0

    // Prepare export data
    const exportData = {
      assessmentId: assessment.id,
      schoolName: assessment.school.name,
      schoolCode: assessment.school.code,
      academicYearName: assessment.academicYear.name,
      semesterName: assessment.semester?.name || null,
      status: assessment.status,
      submittedAt: assessment.submittedAt,
      createdBy: `${assessment.createdBy.firstName} ${assessment.createdBy.lastName}`,
      overallScore: Math.round(overallScore * 100) / 100,
      domainScores,
      totalResponses: assessment.responses.length,
      exportedAt: new Date(),
    }

    return NextResponse.json<APIResponse>(
      {
        success: true,
        data: { assessment: exportData },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Export assessment error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล' },
      { status: 500 }
    )
  }
}
