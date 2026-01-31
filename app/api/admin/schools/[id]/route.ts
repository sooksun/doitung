import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

// GET /api/admin/schools/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        network: {
          include: {
            office: true,
          },
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        assessments: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    })

    if (!school) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่พบโรงเรียน' },
        { status: 404 }
      )
    }

    return NextResponse.json<APIResponse>(
      {
        success: true,
        data: { school },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get school error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโรงเรียน' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/schools/[id]
const updateSchoolSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อโรงเรียน').optional(),
  code: z.string().nullable().optional(),
  networkId: z.string().min(1, 'กรุณาเลือกเครือข่าย').optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    const validationResult = updateSchoolSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const school = await prisma.school.update({
      where: { id },
      data: validationResult.data,
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
        message: 'อัปเดตโรงเรียนสำเร็จ',
        data: { school },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update school error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตโรงเรียน' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/schools/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
        { success: false, message: 'เฉพาะ Super Admin เท่านั้นที่สามารถลบโรงเรียนได้' },
        { status: 403 }
      )
    }

    // Check if school has users or assessments
    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            assessments: true,
          },
        },
      },
    })

    if (!school) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่พบโรงเรียน' },
        { status: 404 }
      )
    }

    if (school._count.users > 0 || school._count.assessments > 0) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่สามารถลบโรงเรียนที่มีผู้ใช้หรือข้อมูลการประเมิน' },
        { status: 400 }
      )
    }

    await prisma.school.delete({
      where: { id },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'ลบโรงเรียนสำเร็จ',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete school error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการลบโรงเรียน' },
      { status: 500 }
    )
  }
}
