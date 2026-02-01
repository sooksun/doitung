import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '../../../lib/prisma'
import { verifyPassword, generateAccessToken, generateRefreshToken } from '../../../lib/auth'
import { AuthResponse } from '../../../lib/types'

const loginSchema = z.object({
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: validationResult.error.errors[0].message,
        },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        officeId: true,
        networkId: true,
        schoolId: true,
      },
    })

    if (!user) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
        },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: 'บัญชีผู้ใช้ถูกระงับ กรุณาติดต่อผู้ดูแลระบบ',
        },
        { status: 403 }
      )
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
        },
        { status: 401 }
      )
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      officeId: user.officeId,
      networkId: user.networkId,
      schoolId: user.schoolId,
    }

    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    // Return success response with cookie
    const responseData: AuthResponse = {
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
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
      accessToken,
      refreshToken,
    }

    const response = NextResponse.json(responseData, { status: 200 })
    
    // Set token in cookie for middleware (allow http in server/docker)
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const isHttps = forwardedProto === 'https' || request.nextUrl.protocol === 'https:'
    response.cookies.set('accessToken', accessToken, {
      httpOnly: false,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
      },
      { status: 500 }
    )
  }
}
