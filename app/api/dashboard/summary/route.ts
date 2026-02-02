import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
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
    const where: Prisma.AssessmentWhereInput = {
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

    // Get assessments with responses and conditions
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
        conditions: true, // เงื่อนไขที่หนุน/ถ่วง (DE)
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

    // Get previous assessments for trend calculation (เปรียบเทียบกับครั้งก่อน)
    const previousAssessments = await prisma.assessment.findMany({
      where: {
        ...where,
        status: AssessmentStatus.SUBMITTED,
        submittedAt: {
          lt: assessments[0]?.submittedAt || new Date(),
        },
      },
      include: {
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
      take: 1,
    })

    const previousAssessment = previousAssessments[0]

    // Calculate domain scores for each assessment (ทั้งสภาพที่เป็นอยู่ และสภาพที่พึงประสงค์)
    const summaries: AssessmentSummary[] = assessments.map((assessment) => {
      const domainScores: DomainScore[] = groups.map((group) => {
        const groupResponses = assessment.responses.filter(
          (r) => r.indicator.groupId === group.id
        )
        const avgCurrent =
          groupResponses.length > 0
            ? groupResponses.reduce((sum, r) => sum + r.score, 0) / groupResponses.length
            : 0
        const withDesired = groupResponses.filter((r) => r.desiredScore != null && r.desiredScore > 0)
        const avgDesired =
          withDesired.length > 0
            ? withDesired.reduce((sum, r) => sum + (r.desiredScore ?? 0), 0) / withDesired.length
            : 0

        // คำนวณ trend (เปรียบเทียบกับครั้งก่อน)
        let trend: 'improving' | 'stable' | 'declining' | 'new' = 'new'
        let previousScore: number | undefined

        if (previousAssessment) {
          const prevGroupResponses = previousAssessment.responses.filter(
            (r) => r.indicator.groupId === group.id
          )
          const prevAvg =
            prevGroupResponses.length > 0
              ? prevGroupResponses.reduce((sum, r) => sum + r.score, 0) / prevGroupResponses.length
              : 0
          previousScore = Math.round(prevAvg * 100) / 100

          const diff = avgCurrent - prevAvg
          if (diff > 0.2) trend = 'improving'
          else if (diff < -0.2) trend = 'declining'
          else trend = 'stable'
        }

        return {
          groupId: group.id,
          groupCode: group.code,
          groupName: group.name,
          groupNameEn: group.nameEn,
          averageScore: Math.round(avgCurrent * 100) / 100,
          averageDesiredScore: Math.round(avgDesired * 100) / 100,
          totalIndicators: group.indicators.length,
          answeredIndicators: groupResponses.length,
          trend,
          previousScore,
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
        conditions: assessment.conditions.map((c) => ({
          id: c.id,
          type: c.type.toLowerCase() as 'supporter' | 'blocker',
          signalText: c.signalText ?? undefined,
          impactText: c.impactText ?? undefined,
          reflectionNote: c.reflectionNote ?? undefined,
          domain: (c.domain as 'Leadership' | 'PLC' | 'Student' | 'Data' | 'Culture') ?? undefined,
          month: c.month ?? undefined,
          description: c.description ?? undefined,
          category: c.category ?? undefined,
          createdAt: c.createdAt,
        })),
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
