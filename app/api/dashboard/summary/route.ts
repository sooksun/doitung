import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '../../../lib/auth'
import { APIResponse, AssessmentSummary, DomainScore } from '../../../lib/types'
import { AssessmentStatus } from '@prisma/client'

// GET /api/dashboard/summary - Get assessment summaries with domain scores
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const academicYearId = searchParams.get('academicYearId')
    const semesterId = searchParams.get('semesterId')
    const status = searchParams.get('status') as AssessmentStatus | null

    // Build filter
    const where: any = {
      status: status || AssessmentStatus.SUBMITTED,
    }

    // Apply role-based filtering
    if (decoded.role === 'SCHOOL_DIRECTOR' || decoded.role === 'TEACHER') {
      if (decoded.schoolId) {
        where.schoolId = decoded.schoolId
      }
    } else if (decoded.role === 'NETWORK_ADMIN') {
      if (decoded.networkId) {
        where.school = {
          networkId: decoded.networkId,
        }
      }
    } else if (decoded.role === 'OFFICE_ADMIN') {
      if (decoded.officeId) {
        where.school = {
          network: {
            officeId: decoded.officeId,
          },
        }
      }
    }

    // Apply additional filters
    if (schoolId) where.schoolId = schoolId
    if (academicYearId) where.academicYearId = academicYearId
    if (semesterId) where.semesterId = semesterId

    // Get assessments with responses
    const assessments = await prisma.assessment.findMany({
      where,
      include: {
        school: {
          select: {
            id: true,
            name: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
        semester: {
          select: {
            id: true,
            name: true,
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
      orderBy: {
        submittedAt: 'desc',
      },
    })

    // Get all indicator groups
    const groups = await prisma.indicatorGroup.findMany({
      include: {
        indicators: true,
      },
      orderBy: {
        orderNo: 'asc',
      },
    })

    // Calculate domain scores for each assessment
    const summaries: AssessmentSummary[] = assessments.map((assessment) => {
      const domainScores: DomainScore[] = groups.map((group) => {
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
        }
      })

      const overallScore =
        domainScores.length > 0
          ? domainScores.reduce((sum, d) => sum + d.averageScore, 0) / domainScores.length
          : 0

      return {
        assessmentId: assessment.id,
        schoolName: assessment.school.name,
        academicYearName: assessment.academicYear.name,
        semesterName: assessment.semester?.name || null,
        status: assessment.status,
        submittedAt: assessment.submittedAt,
        domainScores,
        overallScore: Math.round(overallScore * 100) / 100,
      }
    })

    return NextResponse.json<APIResponse<{ summaries: AssessmentSummary[] }>>(
      {
        success: true,
        data: { summaries },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get dashboard summary error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุป' },
      { status: 500 }
    )
  }
}
