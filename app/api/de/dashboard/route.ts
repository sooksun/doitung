import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getTokenFromHeader, verifyAccessToken } from '@/lib/auth'
import { APIResponse } from '@/lib/types'

// GET /api/de/dashboard - DE Signals Dashboard data
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

    if (!schoolId) {
      return NextResponse.json<APIResponse>({ success: false, message: 'กรุณาระบุโรงเรียน' }, { status: 400 })
    }

    // Fetch all DE data for the school in parallel
    const [
      learningLogs,
      plcSessions,
      studentSignals,
      experiments,
      reflections,
      conditions,
    ] = await Promise.all([
      prisma.learningLog.findMany({
        where: { schoolId },
        include: { createdBy: { select: { firstName: true, lastName: true } } },
        orderBy: { month: 'desc' },
        take: 20,
      }),
      prisma.pLCSession.findMany({
        where: { schoolId },
        include: { createdBy: { select: { firstName: true, lastName: true } } },
        orderBy: { sessionDate: 'desc' },
        take: 10,
      }),
      prisma.studentSignal.findMany({
        where: { schoolId },
        include: { createdBy: { select: { firstName: true, lastName: true } } },
        orderBy: { month: 'desc' },
        take: 10,
      }),
      prisma.experiment.findMany({
        where: { schoolId },
        include: { createdBy: { select: { firstName: true, lastName: true } } },
        orderBy: { month: 'desc' },
        take: 10,
      }),
      prisma.monthlyReflection.findMany({
        where: { schoolId },
        include: { createdBy: { select: { firstName: true, lastName: true } } },
        orderBy: { month: 'desc' },
        take: 6,
      }),
      prisma.developmentCondition.findMany({
        where: { assessment: { schoolId } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    // Calculate PLC Quality averages
    const plcWithSignals = plcSessions.filter(
      (s) => s.safetyLevel && s.questionDepth && s.studentConnection && s.actionFollowUp
    )
    const plcQuality = plcWithSignals.length > 0
      ? {
          safetyLevel: Math.round(
            plcWithSignals.reduce((sum, s) => sum + (s.safetyLevel || 0), 0) / plcWithSignals.length * 10
          ) / 10,
          questionDepth: Math.round(
            plcWithSignals.reduce((sum, s) => sum + (s.questionDepth || 0), 0) / plcWithSignals.length * 10
          ) / 10,
          studentConnection: Math.round(
            plcWithSignals.reduce((sum, s) => sum + (s.studentConnection || 0), 0) / plcWithSignals.length * 10
          ) / 10,
          actionFollowUp: Math.round(
            plcWithSignals.reduce((sum, s) => sum + (s.actionFollowUp || 0), 0) / plcWithSignals.length * 10
          ) / 10,
          sessionCount: plcWithSignals.length,
        }
      : null

    // Separate conditions
    const supporters = conditions.filter((c) => c.type === 'SUPPORTER')
    const blockers = conditions.filter((c) => c.type === 'BLOCKER')

    // Latest reflection for "Next Adaptation"
    const latestReflection = reflections.length > 0 ? reflections[0] : null

    // Experiment summary
    const experimentSummary = {
      planned: experiments.filter((e) => e.status === 'PLANNED').length,
      inProgress: experiments.filter((e) => e.status === 'IN_PROGRESS').length,
      completed: experiments.filter((e) => e.status === 'COMPLETED').length,
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        learningTimeline: learningLogs,
        plcSessions,
        plcQuality,
        studentSignals,
        experiments,
        experimentSummary,
        reflections,
        latestReflection,
        conditions: { supporters, blockers },
      },
    })
  } catch (error) {
    console.error('Get DE dashboard error:', error)
    return NextResponse.json<APIResponse>({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 })
  }
}
