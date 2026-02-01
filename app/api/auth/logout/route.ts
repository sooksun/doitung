import { NextResponse } from 'next/server'
import { APIResponse } from '@/lib/types'

export async function POST() {
  try {
    // In a stateless JWT system, logout is handled client-side
    // by removing the tokens from storage
    // This endpoint can be used for additional cleanup if needed
    // (e.g., blacklisting tokens, logging, etc.)

    return NextResponse.json<APIResponse>(
      {
        success: true,
        message: 'ออกจากระบบสำเร็จ',
      },
      { status: 200 }
    )
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
