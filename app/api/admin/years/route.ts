import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '../../../lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '../../../lib/auth'
import { APIResponse } from '../../../lib/types'

// GET /api/admin/years - Get all academic years and semesters
export async function GET(request: NextRequest) {
  try {
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

    // Get academic years with semesters
    const years = await prisma.academicYear.findMany({
      include: {
        semesters: {
          orderBy: {
            name: 'asc',
          },
        },
        _count: {
          select: {
            assessments: true,
          },
        },
      },
      orderBy: {
        year: 'desc',
      },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        data: { years },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get academic years error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลปีการศึกษา' },
      { status: 500 }
    )
  }
}

// POST /api/admin/years - Create new academic year
const createYearSchema = z.object({
  year: z.number().int().min(2500, 'ปีการศึกษาไม่ถูกต้อง'),
  name: z.string().min(1, 'กรุณากรอกชื่อปีการศึกษา'),
})

export async function POST(request: NextRequest) {
  try {
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

    if (decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'OFFICE_ADMIN') {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = createYearSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { year, name } = validationResult.data

    // Check if year already exists
    const existing = await prisma.academicYear.findUnique({
      where: { year },
    })

    if (existing) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ปีการศึกษานี้มีอยู่แล้ว' },
        { status: 400 }
      )
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        year,
        name,
      },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'สร้างปีการศึกษาสำเร็จ',
        data: { academicYear },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create academic year error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการสร้างปีการศึกษา' },
      { status: 500 }
    )
  }
}
