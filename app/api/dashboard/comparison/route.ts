import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '../../../lib/auth'
import { APIResponse, ComparisonData } from '../../../lib/types'
import { AssessmentStatus } from '@prisma/client'

// GET /api/dashboard/comparison - Get multi-year comparison data
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

    // Build filter
    const where: any = {
      status: AssessmentStatus.SUBMITTED,
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
    if (networkId && !where.school) {
      where.school = { networkId }
    }
    if (officeId && !where.school) {
      where.school = { network: { officeId } }
    }

    // Get assessments with responses grouped by year
    const assessments = await prisma.assessment.findMany({
      where,
      include: {
        academicYear: true,
        semester: true,
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
        academicYear: {
          year: 'asc',
        },
      },
    })

    // Get all indicator groups
    const groups = await prisma.indicatorGroup.findMany({
      orderBy: {
        orderNo: 'asc',
      },
    })

    // Group assessments by academic year and semester
    const yearSemesterMap = new Map<string, typeof assessments>()
    
    assessments.forEach((assessment) => {
      const key = assessment.semester
        ? `${assessment.academicYear.name}-${assessment.semester.name}`
        : assessment.academicYear.name
      
      if (!yearSemesterMap.has(key)) {
        yearSemesterMap.set(key, [])
      }
      yearSemesterMap.get(key)!.push(assessment)
    })

    // Calculate average scores for each year/semester
    const comparisonData: ComparisonData[] = Array.from(yearSemesterMap.entries()).map(
      ([key, assessments]) => {
        const domainScores: { [groupName: string]: number } = {}

        groups.forEach((group) => {
          const allGroupResponses = assessments.flatMap((a) =>
            a.responses.filter((r) => r.indicator.groupId === group.id)
          )

          const averageScore =
            allGroupResponses.length > 0
              ? allGroupResponses.reduce((sum, r) => sum + r.score, 0) /
                allGroupResponses.length
              : 0

          domainScores[group.name] = Math.round(averageScore * 100) / 100
        })

        const overallScore =
          Object.keys(domainScores).length > 0
            ? Object.values(domainScores).reduce((sum, score) => sum + score, 0) /
              Object.keys(domainScores).length
            : 0

        const [year, semester] = key.split('-')

        return {
          year,
          semester,
          domainScores,
          overallScore: Math.round(overallScore * 100) / 100,
        }
      }
    )

    return NextResponse.json<APIResponse<{ comparison: ComparisonData[] }>>(
      {
        success: true,
        data: { comparison: comparisonData },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get comparison data error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเปรียบเทียบ' },
      { status: 500 }
    )
  }
}
