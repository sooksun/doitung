// lib/api-types.ts
// TypeScript types for API requests and responses

import { InstrumentType, ScaleType, EvaluationStatus, RoleType } from '@prisma/client';

// Common types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Instrument types
export interface InstrumentDto {
  id: number;
  code: string;
  nameTh: string;
  nameEn: string | null;
  description: string | null;
  type: InstrumentType;
  version: string | null;
  isActive: boolean;
  sectionsCount?: number;
  indicatorsCount?: number;
}

export interface InstrumentSectionDto {
  id: number;
  instrumentId: number;
  nameTh: string;
  nameEn: string | null;
  description: string | null;
  order: number;
  indicatorsCount?: number;
}

export interface IndicatorDto {
  id: number;
  instrumentId: number;
  sectionId: number | null;
  itemCode: string | null;
  textTh: string;
  textEn: string | null;
  scaleType: ScaleType;
  minScore: number;
  maxScore: number;
  levelDescriptors: any;
  isActive: boolean;
}

// Evaluation types
export interface EvaluationSessionDto {
  id: number;
  instrumentId: number;
  schoolId: number;
  networkId?: number;
  academicYearId: number;
  termId: number | null;
  evaluatorId: number;
  targetTeacherId: number | null;
  targetSchoolId: number | null;
  status: EvaluationStatus;
  note: string | null;
  reflection?: string | null;
  createdAt: Date;
  submittedAt: Date | null;
  instrument?: InstrumentDto;
  school?: { id: number; code: string | null; name: string; nameTh: string | null };
  academicYear?: { id: number; year: string };
  term?: { id: number; name: string };
  evaluator?: { id: number; name: string; email: string | null };
  targetTeacherName?: string | null;
  responsesCount?: number;
}

export interface EvaluationResponseDto {
  id: number;
  evaluationSessionId: number;
  indicatorId: number;
  score: number; // เป้าหมายการพัฒนา (Desired State / Target)
  score2: number | null; // สภาพที่เป็นอยู่ (Current State) - สำหรับ Q-Model
  comment: string | null;
  evidenceUrl: string | null;
  indicator?: IndicatorDto;
}

// Dashboard types
export interface DashboardSummaryDto {
  completionRate: number;
  overallQualityIndex: number;
  kpiCards: {
    label: string;
    value: number;
    unit?: string;
    status?: 'green' | 'yellow' | 'red';
  }[];
}

export interface QModelDimensionProgressDto {
  dimension: string;
  labelTh: string;
  current: number;
  target: number;
  progress: number;
  status: 'green' | 'yellow' | 'red';
}

export interface ComparisonDto {
  id: number;
  name: string;
  nameTh: string | null;
  data: {
    dimension: string;
    value: number;
  }[];
}

// Network types
export interface SchoolNetworkDto {
  id: number;
  code: string | null;
  name: string;
  nameTh: string | null;
  description: string | null;
  isActive: boolean;
  membersCount?: number;
}

export interface SchoolDto {
  id: number;
  code: string | null;
  name: string;
  nameTh: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  isActive: boolean;
  networks?: SchoolNetworkDto[];
}
