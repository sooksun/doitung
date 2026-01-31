import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

// PUT /api/admin/indicators/[id]
const updateIndicatorSchema = z.object({
  code: z.string().min(1, 'กรุณากรอกรหัสตัวชี้วัด').optional(),
  title: z.string().min(1, 'กรุณากรอกชื่อตัวชี้วัด').optional(),
  groupId: z.string().min(1, 'กรุณาเลือกกลุ่มตัวชี้วัด').optional(),
  orderNo: z.number().int().min(1, 'ลำดับต้องมากกว่า 0').optional(),
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

    if (decoded.role !== 'SUPER_ADMIN') {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'เฉพาะ Super Admin เท่านั้นที่สามารถแก้ไขตัวชี้วัดได้' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = updateIndicatorSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const indicator = await prisma.indicator.update({
      where: { id },
      data: validationResult.data,
      include: {
        group: true,
      },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'อัปเดตตัวชี้วัดสำเร็จ',
        data: { indicator },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update indicator error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตตัวชี้วัด' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/indicators/[id]
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
        { success: false, message: 'เฉพาะ Super Admin เท่านั้นที่สามารถลบตัวชี้วัดได้' },
        { status: 403 }
      )
    }

    // Check if indicator has responses
    const indicator = await prisma.indicator.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            responses: true,
          },
        },
      },
    })

    if (!indicator) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่พบตัวชี้วัด' },
        { status: 404 }
      )
    }

    if (indicator._count.responses > 0) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่สามารถลบตัวชี้วัดที่มีข้อมูลการประเมิน' },
        { status: 400 }
      )
    }

    await prisma.indicator.delete({
      where: { id },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'ลบตัวชี้วัดสำเร็จ',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete indicator error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการลบตัวชี้วัด' },
      { status: 500 }
    )
  }
}
