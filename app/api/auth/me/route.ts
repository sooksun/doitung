import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromHeader, verifyAccessToken } from '../../../lib/auth'
import prisma from '../../../lib/prisma'
import { APIResponse } from '../../../lib/types'

export async function GET(request: NextRequest) {
  try {
    // Get token from header
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          message: 'ไม่พบ access token',
        },
        { status: 401 }
      )
    }

    // Verify token
    const decoded = verifyAccessToken(token)
    if (!decoded) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          message: 'Access token ไม่ถูกต้องหรือหมดอายุ',
        },
        { status: 401 }
      )
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
        officeId: true,
        networkId: true,
        schoolId: true,
        createdAt: true,
        lastLogin: true,
        office: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        network: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        school: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          message: 'ไม่พบข้อมูลผู้ใช้',
        },
        { status: 404 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          message: 'บัญชีผู้ใช้ถูกระงับ',
        },
        { status: 403 }
      )
    }

    // Return user data
    return NextResponse.json<APIResponse>(
      {
        success: true,
        data: user,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get user data error:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้',
      },
      { status: 500 }
    )
  }
}
