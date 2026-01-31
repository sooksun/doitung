import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

// GET /api/admin/offices
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

    const offices = await prisma.educationOffice.findMany({
      include: {
        _count: {
          select: {
            networks: true,
            users: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        data: { offices },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get offices error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสำนักงานเขต' },
      { status: 500 }
    )
  }
}

// POST /api/admin/offices
const createOfficeSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อสำนักงานเขต'),
  code: z.string().optional(),
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
        { success: false, message: 'เฉพาะ Super Admin เท่านั้นที่สามารถสร้างสำนักงานเขตได้' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = createOfficeSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, code } = validationResult.data

    if (code) {
      const existing = await prisma.educationOffice.findUnique({
        where: { code },
      })

      if (existing) {
        return NextResponse.json<APIResponse>(
          { success: false, message: 'รหัสสำนักงานเขตนี้ถูกใช้งานแล้ว' },
          { status: 400 }
        )
      }
    }

    const office = await prisma.educationOffice.create({
      data: {
        name,
        code: code || null,
      },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'สร้างสำนักงานเขตสำเร็จ',
        data: { office },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create office error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการสร้างสำนักงานเขต' },
      { status: 500 }
    )
  }
}
