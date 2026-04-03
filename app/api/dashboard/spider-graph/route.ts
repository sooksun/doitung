// app/api/dashboard/spider-graph/route.ts
// GET /api/dashboard/spider-graph - Get data for Spider/Radar chart
// Returns: Q-Dimensions with currentState and targetDesiredState averages

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, parseIntParam } from '@/lib/api-utils';

export interface SpiderGraphDataPoint {
  groupName: string; // ชื่อ Q-Dimension (เช่น "Q-Leadership", "Q-PLC")
  currentState: number; // ค่าเฉลี่ย currentState (1-5)
  targetDesiredState: number; // ค่าเฉลี่ย targetDesiredState (1-5)
}

// กำหนดลำดับ Q-Dimensions
const Q_DIMENSIONS = [
  { dimension: 'Q-Leadership', labelTh: 'Q-Leadership: ภาวะผู้นำทางวิชาการ', order: 1 },
  { dimension: 'Q-PLC', labelTh: 'Q-PLC: ชุมชนแห่งการเรียนรู้ทางวิชาชีพ', order: 2 },
  { dimension: 'Q-Learning', labelTh: 'Q-Learning: การจัดการเรียนรู้', order: 3 },
  { dimension: 'Q-Goal', labelTh: 'Q-Goal: เป้าหมายโรงเรียน', order: 4 },
  { dimension: 'Q-Info', labelTh: 'Q-Info: ระบบสารสนเทศ', order: 5 },
  { dimension: 'Q-Network', labelTh: 'Q-Network: เครือข่ายความร่วมมือ', order: 6 },
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolId = parseIntParam(searchParams, 'schoolId');
    const academicYearId = parseIntParam(searchParams, 'academicYearId');
    const termId = parseIntParam(searchParams, 'termId');

    const dataPoints: SpiderGraphDataPoint[] = [];

    // จัดกลุ่มตาม Q-Dimension
    for (const dim of Q_DIMENSIONS) {
      // หา OKR Objectives ที่มี dimension นี้
      const objectives = await prisma.oKRObjective.findMany({
        where: {
          dimension: dim.dimension,
          ...(schoolId && { schoolId }),
          ...(academicYearId && { academicYearId }),
          status: { not: 'ARCHIVED' },
        },
        include: {
          keyResults: {
            include: {
              actions: {
                select: {
                  id: true,
                  targetDesiredState: true,
                  ratings: {
                    where: {
                      ...(schoolId && { schoolId }),
                      ...(academicYearId && { academicYearId }),
                      ...(termId && { termId }),
                    },
                    orderBy: { evaluatedAt: 'desc' },
                    take: 1, // Get latest rating only
                    select: {
                      currentState: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // รวบรวม Actions ทั้งหมดจากทุก Objective ใน Dimension นี้
      const allActions: Array<{
        id: number;
        targetDesiredState: number | null;
        latestCurrentState: number | null;
      }> = [];

      for (const objective of objectives) {
        for (const keyResult of objective.keyResults) {
          for (const action of keyResult.actions) {
            // Get latest currentState from ratings
            const latestRating = action.ratings.length > 0 ? action.ratings[0] : null;
            const latestCurrentState = latestRating ? latestRating.currentState : null;

            allActions.push({
              id: action.id,
              targetDesiredState: action.targetDesiredState,
              latestCurrentState,
            });
          }
        }
      }

      // คำนวณค่าเฉลี่ย
      const actionsWithCurrentState = allActions.filter((a) => a.latestCurrentState !== null);
      const actionsWithTarget = allActions.filter((a) => a.targetDesiredState !== null);

      const avgCurrentState =
        actionsWithCurrentState.length > 0
          ? actionsWithCurrentState.reduce((sum, a) => sum + (a.latestCurrentState || 0), 0) /
            actionsWithCurrentState.length
          : 0;

      const avgTargetDesiredState =
        actionsWithTarget.length > 0
          ? actionsWithTarget.reduce((sum, a) => sum + (a.targetDesiredState || 0), 0) /
            actionsWithTarget.length
          : 0;

      // เพิ่มข้อมูลทุก Dimension (แม้ไม่มีข้อมูลก็แสดง 0)
      dataPoints.push({
        groupName: dim.labelTh,
        currentState: Math.round(avgCurrentState * 10) / 10, // Round to 1 decimal
        targetDesiredState: Math.round(avgTargetDesiredState * 10) / 10,
      });
    }

    // เรียงลำดับตาม order
    dataPoints.sort((a, b) => {
      const aOrder = Q_DIMENSIONS.find((d) => d.labelTh === a.groupName)?.order || 999;
      const bOrder = Q_DIMENSIONS.find((d) => d.labelTh === b.groupName)?.order || 999;
      return aOrder - bOrder;
    });

    return successResponse({ dataPoints });
  } catch (error) {
    return handleApiError(error);
  }
}

