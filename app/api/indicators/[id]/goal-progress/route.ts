// app/api/indicators/[id]/goal-progress/route.ts
// GET /api/indicators/:id/goal-progress - Get goal and progress for indicator
// Returns targetDesiredState from Action Set Goal and latest KR progress

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-utils';
import { calculateKRCurrent, calculateKRProgress } from '@/lib/rbm-calculator';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const indicatorId = parseInt(params.id, 10);
    if (isNaN(indicatorId)) {
      return errorResponse('Invalid indicator ID', 400);
    }

    const searchParams = request.nextUrl.searchParams;
    const schoolId = searchParams.get('schoolId') ? parseInt(searchParams.get('schoolId')!, 10) : undefined;
    const academicYearId = searchParams.get('academicYearId') ? parseInt(searchParams.get('academicYearId')!, 10) : undefined;
    const termId = searchParams.get('termId') ? parseInt(searchParams.get('termId')!, 10) : undefined;

    // Find KR linked to this indicator
    const krLinks = await prisma.oKRKeyResultIndicator.findMany({
      where: { indicatorId },
      include: {
        keyResult: {
          include: {
            objective: {
              select: {
                id: true,
                schoolId: true,
                academicYearId: true,
              },
            },
            actions: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                targetDesiredState: true,
              },
            },
          },
        },
      },
    });

    console.log(`[DEBUG] Indicator ${indicatorId} - Found ${krLinks.length} KR links`);

    // Find the most relevant KR (matching school and academic year if provided)
    let targetDesiredState: number | null = null;
    let krProgress: { progress: number; current: number | null; target: number | null; evaluatedAt?: Date } | null = null;

    const filters = {
      schoolId,
      academicYearId,
      termId,
    };

    for (const link of krLinks) {
      const kr = link.keyResult;
      
      // Check if KR matches filters
      if (schoolId && kr.objective.schoolId !== schoolId) continue;
      if (academicYearId && kr.objective.academicYearId !== academicYearId) continue;

      // Get targetDesiredState from first action with goal set
      if (!targetDesiredState) {
        const actionWithGoal = kr.actions.find(a => a.targetDesiredState !== null);
        if (actionWithGoal) {
          targetDesiredState = actionWithGoal.targetDesiredState;
          console.log(`[DEBUG] Found targetDesiredState: ${targetDesiredState} from action ${actionWithGoal.id} for KR ${kr.id}`);
        } else {
          console.log(`[DEBUG] No action with goal set for KR ${kr.id}, actions count: ${kr.actions.length}`);
        }
      }

      // Get latest OKRActionRating for this KR
      try {
        // Get all actions for this KR
        const actions = await prisma.oKRAction.findMany({
          where: { keyResultId: kr.id },
          select: { id: true },
        });

        if (actions.length > 0) {
          const actionIds = actions.map(a => a.id);
          
          // Build where clause for ratings
          const ratingWhere: any = {
            actionId: { in: actionIds },
          };
          
          if (schoolId) ratingWhere.schoolId = schoolId;
          if (academicYearId) ratingWhere.academicYearId = academicYearId;
          if (termId) ratingWhere.termId = termId;

          // Get latest rating
          const latestRating = await prisma.oKRActionRating.findFirst({
            where: ratingWhere,
            orderBy: { evaluatedAt: 'desc' },
            select: {
              currentState: true,
              desiredState: true,
              evaluatedAt: true,
            },
          });

          if (latestRating) {
            // Calculate progress: currentState / desiredState * 100
            // หรือ currentState / targetDesiredState * 100 ถ้ามี
            const target = targetDesiredState || latestRating.desiredState || 5;
            const current = latestRating.currentState;
            const progress = target > 0 ? (current / target) * 100 : 0;
            const clampedProgress = Math.max(0, Math.min(100, progress));

            // Compare with existing progress by evaluatedAt
            const shouldUpdate = !krProgress || 
              (krProgress.evaluatedAt && latestRating.evaluatedAt > krProgress.evaluatedAt) ||
              !krProgress.evaluatedAt;
            
            if (shouldUpdate) {
              krProgress = {
                progress: clampedProgress,
                current: current,
                target: target,
                evaluatedAt: latestRating.evaluatedAt,
              };
            }
          }
        }
      } catch (ratingError) {
        console.error(`Error fetching latest rating for KR ${kr.id}:`, ratingError);
      }
    }

    // Always return targetDesiredState (even if null) and krProgress (even if null)
    return successResponse({
      indicatorId,
      targetDesiredState: targetDesiredState ?? null,
      krProgress: krProgress ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

