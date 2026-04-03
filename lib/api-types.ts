// lib/api-types.ts
// TypeScript types for API requests and responses

import { InstrumentType, ScaleType, EvaluationStatus, Quarter, ActionStatus, OKRStatus, RoleType } from '@prisma/client';

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
  createdAt: Date;
  submittedAt: Date | null;
  instrument?: InstrumentDto;
  school?: { id: number; code: string | null; name: string; nameTh: string | null };
  academicYear?: { id: number; year: string };
  term?: { id: number; name: string };
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

// OKR types
export interface OKRObjectiveDto {
  id: number;
  code: string | null;
  title: string;
  description: string | null;
  dimension: string | null;
  status: OKRStatus;
  schoolId: number | null;
  networkId: number | null;
  academicYearId: number | null;
  ownerId: number | null;
  quarter: Quarter | null;
  keyResultsCount?: number;
  progress?: number; // Calculated progress %
}

export interface OKRKeyResultDto {
  id: number;
  objectiveId: number;
  title: string;
  description: string | null;
  baseline: number | null;
  target: number | null;
  current: number | null;
  unit: string | null;
  quarter: Quarter | null;
  ownerId: number | null;
  progress?: number; // Calculated progress %
  status?: 'green' | 'yellow' | 'red'; // Traffic light status
  indicatorsCount?: number;
  actionsCount?: number;
}

export interface OKRActionDto {
  id: number;
  keyResultId: number;
  title: string;
  description: string | null;
  order: number;
  ownerId: number | null;
  startDate: Date | null;
  endDate: Date | null;
  status: ActionStatus;
  requiredResources: string | null;
  risks: string | null;
  mitigation: string | null;
  expectedOutputs: string | null;
  expectedOutcomes: string | null;
  evidenceOfSuccess: string | null;
  ratingsCount?: number;
  averageCurrentState?: number;
  averageDesiredState?: number;
  targetCurrentState?: number | null; // ค่าเป้าหมายสำหรับ Current State
  targetDesiredState?: number | null; // ค่าเป้าหมายสำหรับ Desired State
  objective?: {
    id: number;
    title: string;
    description: string | null;
    dimension: string | null;
  };
  keyResult?: {
    id: number;
    title: string;
    description: string | null;
  };
}

// OKR Action Rating types
export interface OKRActionRatingDto {
  id: number;
  actionId: number;
  currentState: number; // 1-5: สภาพที่เป็นอยู่ก่อนดำเนินการ
  desiredState: number; // 1-5: สภาพที่คาดหมายหลังดำเนินการ
  comment: string | null;
  evaluatorId: number;
  schoolId: number | null;
  academicYearId: number | null;
  termId: number | null;
  evaluatedAt: Date;
  evaluator?: {
    id: number;
    name: string;
    email: string;
  };
  school?: {
    id: number;
    code: string | null;
    name: string;
    nameTh: string | null;
  };
  academicYear?: {
    id: number;
    year: string;
  };
  term?: {
    id: number;
    name: string;
  };
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
