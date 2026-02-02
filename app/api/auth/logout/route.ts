import { NextRequest, NextResponse } from 'next/server'
import { APIResponse } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'ออกจากระบบสำเร็จ',
      },
      { status: 200 }
    )

    // ลบ cookie accessToken เพื่อให้ middleware ไม่เห็น token
    response.cookies.set('accessToken', '', {
      httpOnly: false,
      secure: request.headers.get('x-forwarded-proto') === 'https',
      sameSite: 'lax',
      maxAge: 0, // อายุหมดทันที
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        message: 'เกิดข้อผิดพลาดในการออกจากระบบ',
      },
      { status: 500 }
    )
  }
}
