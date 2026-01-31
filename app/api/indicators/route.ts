import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

// GET /api/indicators - Get all indicators grouped by category
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
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

    // Get all indicator groups with indicators
    const groups = await prisma.indicatorGroup.findMany({
      include: {
        indicators: {
          orderBy: {
            orderNo: 'asc',
          },
        },
      },
      orderBy: {
        orderNo: 'asc',
      },
    })

    // Transform data
    const transformedGroups = groups.map((group) => ({
      id: group.id,
      code: group.code,
      name: group.name,
      nameEn: group.nameEn,
      orderNo: group.orderNo,
      indicatorCount: group.indicators.length,
      indicators: group.indicators.map((indicator) => ({
        id: indicator.id,
        code: indicator.code,
        title: indicator.title,
        groupId: indicator.groupId,
        orderNo: indicator.orderNo,
      })),
    }))

    return NextResponse.json<APIResponse>(
      {
        success: true,
        data: {
          groups: transformedGroups,
          totalGroups: transformedGroups.length,
          totalIndicators: transformedGroups.reduce((sum, g) => sum + g.indicatorCount, 0),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get indicators error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตัวชี้วัด' },
      { status: 500 }
    )
  }
}
