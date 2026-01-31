import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

// PUT /api/admin/networks/[id]
const updateNetworkSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อเครือข่าย').optional(),
  officeId: z.string().min(1, 'กรุณาเลือกสำนักงานเขต').optional(),
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

    if (decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'OFFICE_ADMIN') {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = updateNetworkSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const network = await prisma.network.update({
      where: { id },
      data: validationResult.data,
      include: {
        office: true,
      },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'อัปเดตเครือข่ายสำเร็จ',
        data: { network },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update network error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตเครือข่าย' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/networks/[id]
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
        { success: false, message: 'เฉพาะ Super Admin เท่านั้นที่สามารถลบเครือข่ายได้' },
        { status: 403 }
      )
    }

    const network = await prisma.network.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            schools: true,
            users: true,
          },
        },
      },
    })

    if (!network) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่พบเครือข่าย' },
        { status: 404 }
      )
    }

    if (network._count.schools > 0 || network._count.users > 0) {
      return NextResponse.json<APIResponse>(
        { success: false, message: 'ไม่สามารถลบเครือข่ายที่มีโรงเรียนหรือผู้ใช้' },
        { status: 400 }
      )
    }

    await prisma.network.delete({
      where: { id },
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'ลบเครือข่ายสำเร็จ',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete network error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการลบเครือข่าย' },
      { status: 500 }
    )
  }
}
