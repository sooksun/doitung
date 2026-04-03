// app/api/evaluations/[id]/responses/route.ts
// POST /api/evaluations/:id/responses - Save evaluation responses (batch)
// GET /api/evaluations/:id/responses - Get evaluation responses

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { EvaluationResponseDto } from '@/lib/api-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const evaluationSessionId = parseInt(params.id, 10);
    if (isNaN(evaluationSessionId)) {
      return errorResponse('Invalid evaluation ID', 400);
    }

    const responses = await prisma.evaluationResponse.findMany({
      where: { evaluationSessionId },
      include: {
        indicator: {
          include: {
            section: {
              select: {
                id: true,
                nameTh: true,
                order: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          indicator: {
            section: {
              order: 'asc',
            },
          },
        },
        {
          indicator: {
            itemCode: 'asc',
          },
        },
      ],
    });

    const responsesDto: EvaluationResponseDto[] = responses.map((response) => ({
      id: response.id,
      evaluationSessionId: response.evaluationSessionId,
      indicatorId: response.indicatorId,
      score: response.score,
      score2: response.score2,
      comment: response.comment,
      evidenceUrl: response.evidenceUrl,
      indicator: {
        id: response.indicator.id,
        instrumentId: response.indicator.instrumentId,
        sectionId: response.indicator.sectionId,
        itemCode: response.indicator.itemCode,
        textTh: response.indicator.textTh,
        textEn: response.indicator.textEn,
        scaleType: response.indicator.scaleType,
        minScore: response.indicator.minScore,
        maxScore: response.indicator.maxScore,
        levelDescriptors: response.indicator.levelDescriptors,
        isActive: response.indicator.isActive,
      },
    }));

    return successResponse(responsesDto);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const evaluationSessionId = parseInt(params.id, 10);
    if (isNaN(evaluationSessionId)) {
      return errorResponse('Invalid evaluation ID', 400);
    }

    // Verify evaluation session exists
    const evaluationSession = await prisma.evaluationSession.findUnique({
      where: { id: evaluationSessionId },
    });

    if (!evaluationSession) {
      return errorResponse('ไม่พบการประเมินที่ต้องการ', 404);
    }

    const body = await request.json();
    const { responses } = body;

    if (!Array.isArray(responses)) {
      return errorResponse('responses must be an array', 400);
    }

    // Validate and prepare responses
    const responsesData = [];
    for (const response of responses) {
      const { indicatorId, score, score2, comment, evidenceUrl } = response;

      if (!indicatorId || score === undefined) {
        return errorResponse('Missing required fields: indicatorId, score', 400);
      }

      // Validate score range by checking indicator
      const indicator = await prisma.indicator.findUnique({
        where: { id: parseInt(indicatorId, 10) },
      });

      if (!indicator) {
        return errorResponse(`Indicator ${indicatorId} not found`, 404);
      }

      if (score < indicator.minScore || score > indicator.maxScore) {
        return errorResponse(
          `Score ${score} out of range for indicator ${indicatorId} (${indicator.minScore}-${indicator.maxScore})`,
          400
        );
      }

      // Validate score2 if provided (for Q-Model: current state)
      if (score2 !== undefined && score2 !== null) {
        if (score2 < indicator.minScore || score2 > indicator.maxScore) {
          return errorResponse(
            `Score2 ${score2} out of range for indicator ${indicatorId} (${indicator.minScore}-${indicator.maxScore})`,
            400
          );
        }
      }

      responsesData.push({
        evaluationSessionId,
        indicatorId: parseInt(indicatorId, 10),
        score: parseInt(score, 10),
        score2: score2 !== undefined && score2 !== null ? parseInt(score2, 10) : null,
        comment: comment || null,
        evidenceUrl: evidenceUrl || null,
      });
    }

    // Use transaction to ensure atomicity
    const createdResponses = await prisma.$transaction(
      responsesData.map((data) =>
        prisma.evaluationResponse.upsert({
          where: {
            evaluationSessionId_indicatorId: {
              evaluationSessionId: data.evaluationSessionId,
              indicatorId: data.indicatorId,
            },
          },
          update: {
            score: data.score,
            score2: data.score2,
            comment: data.comment,
            evidenceUrl: data.evidenceUrl,
          },
          create: data,
        })
      )
    );

    return successResponse(
      createdResponses.map((r) => ({
        id: r.id,
        evaluationSessionId: r.evaluationSessionId,
        indicatorId: r.indicatorId,
        score: r.score,
        score2: r.score2,
        comment: r.comment,
        evidenceUrl: r.evidenceUrl,
      })),
      `บันทึกคำตอบสำเร็จ ${createdResponses.length} ข้อ`
    );
  } catch (error) {
    return handleApiError(error);
  }
}

