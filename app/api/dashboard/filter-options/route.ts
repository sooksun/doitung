import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

// GET /api/dashboard/filter-options - ดึงตัวเลือกตัวกรองจาก database จริง
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

    // 1. ปีการศึกษา + ภาคเรียน จาก database
    const academicYears = await prisma.academicYear.findMany({
      include: {
        semesters: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { year: 'desc' },
    })

    // 2. โรงเรียน - ตาม role
    let schools: { id: string; name: string }[] = []
    const isAdmin = ['SUPER_ADMIN', 'OFFICE_ADMIN', 'NETWORK_ADMIN'].includes(decoded.role)

    if (isAdmin) {
      const where: { networkId?: string; network?: { officeId: string } } = {}
      if (decoded.role === 'NETWORK_ADMIN' && decoded.networkId) {
        where.networkId = decoded.networkId
      } else if (decoded.role === 'OFFICE_ADMIN' && decoded.officeId) {
        where.network = { officeId: decoded.officeId }
      }
      const schoolList = await prisma.school.findMany({
        where,
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
      schools = schoolList
    } else if ((decoded.role === 'SCHOOL_DIRECTOR' || decoded.role === 'TEACHER') && decoded.schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: decoded.schoolId },
        select: { id: true, name: true },
      })
      if (school) schools = [school]
    }

    // แปลงปีการศึกษาเป็นรูปแบบ dropdown
    const yearOptions = academicYears.map((y) => ({
      id: y.id,
      name: y.name,
      year: y.year,
    }))

    // แปลงภาคเรียน (รวมทุกปี) - ใช้ semester id จริง
    const semesterOptions = academicYears.flatMap((y) =>
      y.semesters.map((s) => ({
        id: s.id,
        name: s.name,
        academicYearId: y.id,
        academicYearName: y.name,
      }))
    )

    return NextResponse.json<APIResponse>(
      {
        success: true,
        data: {
          academicYears: yearOptions,
          semesters: semesterOptions,
          schools,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get filter options error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงตัวเลือกตัวกรอง' },
      { status: 500 }
    )
  }
}
