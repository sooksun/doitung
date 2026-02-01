import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import prisma from '../../../lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '../../../lib/auth'
import { APIResponse } from '../../../lib/types'

// GET /api/admin/schools - List all schools
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const networkId = searchParams.get('networkId')
    const officeId = searchParams.get('officeId')

    // Build filter
    const where: Prisma.SchoolWhereInput = {}

    // Apply role-based filter
    if (decoded.role === 'NETWORK_ADMIN' && decoded.networkId) {
      where.networkId = decoded.networkId
    } else if (decoded.role === 'OFFICE_ADMIN' && decoded.officeId) {
      where.network = {
        officeId: decoded.officeId,
      }
    }

    // Apply additional filters
    if (networkId) where.networkId = networkId
    if (officeId && !where.network) {
      where.network = { officeId }
    }

    // Search
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ]
    }

    const total = await prisma.school.count({ where })

    const schools = await prisma.school.findMany({
      where,
      include: {
        network: {
          include: {
            office: true,
          },
        },
        _count: {
          select: {
            users: true,
            assessments: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        data: {
          schools,
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
    console.error('Get schools error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโรงเรียน' },
      { status: 500 }
    )
  }
}

// POST /api/admin/schools - Create new school
const createSchoolSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อโรงเรียน'),
  code: z.string().optional(),
  networkId: z.string().min(1, 'กรุณาเลือกเครือข่าย'),
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

    if (decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'OFFICE_ADMIN' && decoded.role !== 'NETWORK_ADMIN') {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = createSchoolSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, code, networkId } = validationResult.data

    // Check if code already exists
    if (code) {
      const existing = await prisma.school.findFirst({
        where: { code },
      })

      if (existing) {
        return NextResponse.json<APIResponse>(
          { success: false, message: 'รหัสโรงเรียนนี้ถูกใช้งานแล้ว' },
          { status: 400 }
        )
      }
    }

    const school = await prisma.school.create({
      data: {
        name,
        code: code || null,
        networkId,
      },
      include: {
        network: {
          include: {
            office: true,
          },
        },
      },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'สร้างโรงเรียนสำเร็จ',
        data: { school },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create school error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการสร้างโรงเรียน' },
      { status: 500 }
    )
  }
}
