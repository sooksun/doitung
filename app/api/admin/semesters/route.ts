import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '../../../lib/prisma'
import { getTokenFromHeader, verifyAccessToken} from '../../../lib/auth'
import { APIResponse } from '../../../lib/types'

// POST /api/admin/semesters - Create new semester
const createSemesterSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อภาคเรียน'),
  academicYearId: z.string().min(1, 'กรุณาเลือกปีการศึกษา'),
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
    const validationResult = createSemesterSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json<APIResponse>(
        { success: false, message: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const semester = await prisma.semester.create({
      data: validationResult.data,
    })

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'สร้างภาคเรียนสำเร็จ',
        data: { semester },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create semester error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการสร้างภาคเรียน' },
      { status: 500 }
    )
  }
}
