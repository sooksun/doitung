import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import prisma from '../../lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '../../lib/auth'
import { APIResponse, Assessment } from '../../lib/types'
import { AssessmentStatus } from '@prisma/client'

// GET /api/assessments - List assessments
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
    const status = searchParams.get('status') as AssessmentStatus | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build filter based on user role
    const where: Prisma.AssessmentWhereInput = {}

    // Filter by school for non-admin users
    if (decoded.role === 'SCHOOL_DIRECTOR' || decoded.role === 'TEACHER') {
      if (!decoded.schoolId) {
        return NextResponse.json<APIResponse>(
          { success: false, message: 'ผู้ใช้ไม่มีโรงเรียนที่สังกัด' },
          { status: 403 }
        )
      }
      where.schoolId = decoded.schoolId
    } else if (schoolId) {
      where.schoolId = schoolId
    }

    // Filter by academic year
    if (academicYearId) {
      where.academicYearId = academicYearId
    }

    // Filter by status
    if (status) {
      where.status = status
    }

    // Count total
    const total = await prisma.assessment.count({ where })

    // Get assessments with pagination
    const assessments = await prisma.assessment.findMany({
      where,
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
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    // Transform data
    const transformedAssessments = assessments.map((assessment) => ({
      ...assessment,
      responseCount: assessment.responses.length,
      responses: undefined, // Remove full responses from list
    }))

    return NextResponse.json<APIResponse<{ assessments: typeof transformedAssessments; pagination: { page: number; limit: number; total: number; totalPages: number } }>>(
      {
        success: true,
        data: {
          assessments: transformedAssessments,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get assessments error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการประเมิน' },
      { status: 500 }
    )
  }
}

// POST /api/assessments - Create new assessment
const createAssessmentSchema = z.object({
  schoolId: z.string().min(1, 'กรุณาเลือกโรงเรียน'),
  academicYearId: z.string().min(1, 'กรุณาเลือกปีการศึกษา'),
  semesterId: z.string().optional(),
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
    const validationResult = createAssessmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { schoolId, academicYearId, semesterId } = validationResult.data
    
    // Debug logging
    console.log('📝 Creating assessment with:', { schoolId, academicYearId, semesterId, userId: decoded.userId })

    // Check if user has permission to create assessment for this school
    if (decoded.role === 'SCHOOL_DIRECTOR' || decoded.role === 'TEACHER') {
      if (decoded.schoolId !== schoolId) {
        return NextResponse.json<APIResponse>(
          { success: false, message: 'คุณไม่มีสิทธิ์สร้างการประเมินสำหรับโรงเรียนนี้' },
          { status: 403 }
        )
      }
    }

    // Check if assessment already exists for this user, school, year, and semester
    // (รองรับหลายผู้ประเมินต่อโรงเรียน - ตรวจสอบเฉพาะของผู้ใช้คนนี้)
    const existingAssessment = await prisma.assessment.findFirst({
      where: {
        schoolId,
        academicYearId,
        semesterId: semesterId || null,
        createdById: decoded.userId, // ตรวจสอบเฉพาะแบบประเมินของผู้ใช้คนนี้
      },
    })

    if (existingAssessment) {
      return NextResponse.json<APIResponse<{ assessment: Assessment }>>(
        {
          success: true,
          message: 'พบการประเมินของคุณที่มีอยู่แล้ว',
          data: { assessment: existingAssessment as Assessment },
        },
        { status: 200 }
      )
    }

    // Create new assessment
    const assessment = await prisma.assessment.create({
      data: {
        schoolId,
        academicYearId,
        semesterId: semesterId || null,
        status: AssessmentStatus.DRAFT,
        createdById: decoded.userId,
      },
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
      },
    })

    return NextResponse.json<APIResponse<{ assessment: Assessment }>>(
      {
        success: true,
        message: 'สร้างการประเมินสำเร็จ',
        data: { assessment: assessment as Assessment },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create assessment error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการสร้างการประเมิน' },
      { status: 500 }
    )
  }
}
