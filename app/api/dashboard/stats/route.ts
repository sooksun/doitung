import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '../../../lib/auth'
import { APIResponse, DashboardStats } from '../../../lib/types'
import { AssessmentStatus } from '@prisma/client'

// GET /api/dashboard/stats - Get dashboard statistics
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
    const networkId = searchParams.get('networkId')
    const officeId = searchParams.get('officeId')
    const academicYearId = searchParams.get('academicYearId')

    // Build filter based on user role and query params
    const where: any = {}

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
    if (networkId && !where.school) {
      where.school = { networkId }
    } else if (networkId && where.school) {
      where.school.networkId = networkId
    }
    if (officeId && !where.school) {
      where.school = { network: { officeId } }
    } else if (officeId && where.school && !where.school.network) {
      where.school.network = { officeId }
    } else if (officeId && where.school?.network) {
      where.school.network.officeId = officeId
    }
    if (academicYearId) where.academicYearId = academicYearId

    // Get total assessments
    const totalAssessments = await prisma.assessment.count({ where })

    // Get completed assessments
    const completedAssessments = await prisma.assessment.count({
      where: {
        ...where,
        status: AssessmentStatus.SUBMITTED,
      },
    })

    // Get draft assessments
    const draftAssessments = await prisma.assessment.count({
      where: {
        ...where,
        status: {
          in: [AssessmentStatus.DRAFT, AssessmentStatus.IN_PROGRESS],
        },
      },
    })

    // Calculate average score from completed assessments
    const completedAssessmentsWithResponses = await prisma.assessment.findMany({
      where: {
        ...where,
        status: AssessmentStatus.SUBMITTED,
      },
      include: {
        responses: {
          select: {
            score: true,
          },
        },
      },
    })

    let averageScore = 0
    if (completedAssessmentsWithResponses.length > 0) {
      const totalScore = completedAssessmentsWithResponses.reduce((sum, assessment) => {
        const assessmentAverage =
          assessment.responses.reduce((rSum, r) => rSum + r.score, 0) /
          (assessment.responses.length || 1)
        return sum + assessmentAverage
      }, 0)
      averageScore = totalScore / completedAssessmentsWithResponses.length
    }

    const stats: DashboardStats = {
      totalAssessments,
      completedAssessments,
      draftAssessments,
      averageScore: Math.round(averageScore * 100) / 100,
      lastUpdated: new Date(),
    }

    return NextResponse.json<APIResponse<{ stats: DashboardStats }>>(
      {
        success: true,
        data: { stats },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ' },
      { status: 500 }
    )
  }
}
