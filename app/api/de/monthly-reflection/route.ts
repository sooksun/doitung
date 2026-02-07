import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

const reflectionSchema = z.object({
  schoolId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)'),
  systemReflection: z.string().optional(),
  continueItems: z.string().optional(),
  stopItems: z.string().optional(),
  expandItems: z.string().optional(),
  nextSteps: z.string().optional(),
})

// GET /api/de/monthly-reflection
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    if (!token) {
      return NextResponse.json<APIResponse>({ success: false, message: 'ไม่พบ access token' }, { status: 401 })
    }
    const decoded = verifyAccessToken(token)
    if (!decoded) {
      return NextResponse.json<APIResponse>({ success: false, message: 'Access token ไม่ถูกต้อง' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId') || decoded.schoolId
    const month = searchParams.get('month')

    const where: Record<string, unknown> = {}
    if (schoolId) where.schoolId = schoolId
    if (month) where.month = month

    const reflections = await prisma.monthlyReflection.findMany({
      where,
      include: {
        school: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { month: 'desc' },
    })

    return NextResponse.json<APIResponse>({ success: true, data: reflections })
  } catch (error) {
    console.error('Get monthly reflections error:', error)
    return NextResponse.json<APIResponse>({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}

// POST /api/de/monthly-reflection - Create or Update (upsert)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)
    if (!token) {
      return NextResponse.json<APIResponse>({ success: false, message: 'ไม่พบ access token' }, { status: 401 })
    }
    const decoded = verifyAccessToken(token)
    if (!decoded) {
      return NextResponse.json<APIResponse>({ success: false, message: 'Access token ไม่ถูกต้อง' }, { status: 401 })
    }

    const body = await request.json()
    const validation = reflectionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    // Upsert: 1 school + 1 month = 1 reflection
    const reflection = await prisma.monthlyReflection.upsert({
      where: {
        schoolId_month: { schoolId: data.schoolId, month: data.month },
      },
      update: {
        systemReflection: data.systemReflection?.trim() || null,
        continueItems: data.continueItems?.trim() || null,
        stopItems: data.stopItems?.trim() || null,
        expandItems: data.expandItems?.trim() || null,
        nextSteps: data.nextSteps?.trim() || null,
      },
      create: {
        schoolId: data.schoolId,
        month: data.month,
        systemReflection: data.systemReflection?.trim() || null,
        continueItems: data.continueItems?.trim() || null,
        stopItems: data.stopItems?.trim() || null,
        expandItems: data.expandItems?.trim() || null,
        nextSteps: data.nextSteps?.trim() || null,
        createdById: decoded.userId,
      },
      include: {
        school: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json<APIResponse>(
      { success: true, message: 'บันทึก Reflection เรียบร้อย', data: reflection },
      { status: 200 }
    )
  } catch (error) {
    console.error('Save monthly reflection error:', error)
    return NextResponse.json<APIResponse>({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
