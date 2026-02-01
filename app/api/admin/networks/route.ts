import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

// GET /api/admin/networks
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

    const { searchParams } = new URL(request.url)
    const officeId = searchParams.get('officeId')
    const search = searchParams.get('search') || ''

    const where: Prisma.NetworkWhereInput = {}
    
    if (decoded.role === 'OFFICE_ADMIN' && decoded.officeId) {
      where.officeId = decoded.officeId
    } else if (officeId) {
      where.officeId = officeId
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const networks = await prisma.network.findMany({
      where,
      include: {
        office: true,
        _count: {
          select: {
            schools: true,
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
        data: { networks },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get networks error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเครือข่าย' },
      { status: 500 }
    )
  }
}

// POST /api/admin/networks
const createNetworkSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อเครือข่าย'),
  officeId: z.string().min(1, 'กรุณาเลือกสำนักงานเขต'),
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
    const validationResult = createNetworkSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const network = await prisma.network.create({
      data: validationResult.data,
      include: {
        office: true,
      },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'สร้างเครือข่ายสำเร็จ',
        data: { network },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create network error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการสร้างเครือข่าย' },
      { status: 500 }
    )
  }
}
