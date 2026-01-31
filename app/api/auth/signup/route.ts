import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '../../../lib/prisma'
import { hashPassword, generateAccessToken, generateRefreshToken } from '../../../lib/auth'
import { AuthResponse } from '../../../lib/types'
import { UserRole } from '@prisma/client'

const signupSchema = z.object({
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  firstName: z.string().min(1, 'กรุณากรอกชื่อ'),
  lastName: z.string().min(1, 'กรุณากรอกนามสกุล'),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).default(UserRole.VIEWER),
  officeId: z.string().optional(),
  networkId: z.string().optional(),
  schoolId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = signupSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: validationResult.error.errors[0].message,
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json<AuthResponse>(
        {
          success: false,
          message: 'อีเมลนี้ถูกใช้งานแล้ว',
        },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        officeId: data.officeId,
        networkId: data.networkId,
        schoolId: data.schoolId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        officeId: true,
        networkId: true,
        schoolId: true,
      },
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

    // Return success response
    const response: AuthResponse = {
      success: true,
      message: 'ลงทะเบียนสำเร็จ',
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

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json<AuthResponse>(
      {
        success: false,
        message: 'เกิดข้อผิดพลาดในการลงทะเบียน',
      },
      { status: 500 }
    )
  }
}
