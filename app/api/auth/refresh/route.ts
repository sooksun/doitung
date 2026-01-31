import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '../../../lib/auth'
import { AuthResponse } from '../../../lib/types'
import prisma from '../../../lib/prisma'

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'กรุณาระบุ refresh token'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = refreshSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: validationResult.error.errors[0].message,
        },
        { status: 400 }
      )
    }

    const { refreshToken } = validationResult.data

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken)
    if (!decoded) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: 'Refresh token ไม่ถูกต้องหรือหมดอายุ',
        },
        { status: 401 }
      )
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        officeId: true,
        networkId: true,
        schoolId: true,
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: 'ผู้ใช้ไม่พบหรือถูกระงับ',
        },
        { status: 401 }
      )
    }

    // Generate new tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      officeId: user.officeId,
      networkId: user.networkId,
      schoolId: user.schoolId,
    }

    const newAccessToken = generateAccessToken(tokenPayload)
    const newRefreshToken = generateRefreshToken(tokenPayload)

    // Return success response
    const response: AuthResponse = {
      success: true,
      message: 'รีเฟรช token สำเร็จ',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        officeId: user.officeId,
        networkId: user.networkId,
        schoolId: user.schoolId,
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Refresh token error:', error)
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        message: 'เกิดข้อผิดพลาดในการรีเฟรช token',
      },
      { status: 500 }
    )
  }
}
