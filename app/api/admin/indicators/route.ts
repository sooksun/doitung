import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

// GET /api/admin/indicators
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

    if (decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'OFFICE_ADMIN') {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      )
    }

    const groups = await prisma.indicatorGroup.findMany({
      include: {
        indicators: {
          orderBy: {
            orderNo: 'asc',
          },
        },
      },
      orderBy: {
        orderNo: 'asc',
      },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        data: { groups },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get indicators error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตัวชี้วัด' },
      { status: 500 }
    )
  }
}

// POST /api/admin/indicators - Create new indicator
const createIndicatorSchema = z.object({
  code: z.string().min(1, 'กรุณากรอกรหัสตัวชี้วัด'),
  title: z.string().min(1, 'กรุณากรอกชื่อตัวชี้วัด'),
  groupId: z.string().min(1, 'กรุณาเลือกกลุ่มตัวชี้วัด'),
  orderNo: z.number().int().min(1, 'ลำดับต้องมากกว่า 0'),
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

    if (decoded.role !== 'SUPER_ADMIN') {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'เฉพาะ Super Admin เท่านั้นที่สามารถสร้างตัวชี้วัดได้' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = createIndicatorSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { code, title, groupId, orderNo } = validationResult.data

    // Check if code already exists
    const existing = await prisma.indicator.findUnique({
      where: { code },
    })

    if (existing) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'รหัสตัวชี้วัดนี้มีอยู่แล้ว' },
        { status: 400 }
      )
    }

    const indicator = await prisma.indicator.create({
      data: {
        code,
        title,
        groupId,
        orderNo,
      },
      include: {
        group: true,
      },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'สร้างตัวชี้วัดสำเร็จ',
        data: { indicator },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create indicator error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการสร้างตัวชี้วัด' },
      { status: 500 }
    )
  }
}
