import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { APIResponse } from '@/lib/types'

// GET /api/de/questions - Get DE questions (optionally by month number)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const monthNumber = searchParams.get('month')

    if (monthNumber) {
      const question = await prisma.dEQuestion.findUnique({
        where: { monthNumber: parseInt(monthNumber) },
      })

      if (!question) {
        return NextResponse.json<APIResponse>(
          { success: false, message: 'ไม่พบคำถามสำหรับเดือนที่ระบุ' },
          { status: 404 }
        )
      }

      return NextResponse.json<APIResponse>({
        success: true,
        data: {
          ...question,
          questions: JSON.parse(question.questions),
        },
      })
    }

    const questions = await prisma.dEQuestion.findMany({
      orderBy: { monthNumber: 'asc' },
    })

    return NextResponse.json<APIResponse>({
      success: true,
      data: questions.map((q) => ({
        ...q,
        questions: JSON.parse(q.questions),
      })),
    })
  } catch (error) {
    console.error('Get DE questions error:', error)
    return NextResponse.json<APIResponse>(
      { success: false, message: 'เกิดข้อผิดพลาดในการดึงคำถาม DE' },
      { status: 500 }
    )
  }
}
