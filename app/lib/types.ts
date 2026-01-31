import { UserRole, AssessmentStatus } from '@prisma/client'

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  officeId?: string | null
  networkId?: string | null
  schoolId?: string | null
}

export interface AuthResponse {
  success: boolean
  message?: string
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: UserRole
    officeId?: string | null
    networkId?: string | null
    schoolId?: string | null
  }
  accessToken?: string
  refreshToken?: string
}

export interface APIResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

// Assessment Types
export interface AssessmentResponse {
  id: string
  indicatorId: string
  score: number           // คะแนนสภาพที่เป็นอยู่ (Current State)
  desiredScore?: number | null  // คะแนนสภาพที่พึงประสงค์ (Desired State)
  note?: string | null
  indicator?: {
    id: string
    code: string
    title: string
    groupId: string
    orderNo: number
  }
  evidence?: EvidenceFile[]
}

export interface Assessment {
  id: string
  schoolId: string
  academicYearId: string
  semesterId?: string | null
  status: AssessmentStatus
  submittedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  createdById: string
  school?: {
    id: string
    name: string
    code?: string | null
  }
  academicYear?: {
    id: string
    year: number
    name: string
  }
  semester?: {
    id: string
    name: string
  }
  responses?: AssessmentResponse[]
  createdBy?: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface EvidenceFile {
  id: string
  responseId: string
  fileName: string
  originalName: string
  filePath: string
  fileSize: number
  mimeType: string
  description?: string | null
  uploadedAt: Date
}

export interface AssessmentFormData {
  schoolId: string
  academicYearId: string
  semesterId?: string
}

export interface AssessmentResponseInput {
  indicatorId: string
  score: number           // คะแนนสภาพที่เป็นอยู่ (Current State)
  desiredScore?: number   // คะแนนสภาพที่พึงประสงค์ (Desired State)
  note?: string
}

export interface AutoSaveData {
  assessmentId: string
  responses: AssessmentResponseInput[]
}

// Dashboard Types
export interface DashboardStats {
  totalAssessments: number
  completedAssessments: number
  draftAssessments: number
  averageScore: number
  lastUpdated: Date
}

export interface DomainScore {
  groupId: string
  groupCode: string
  groupName: string
  groupNameEn: string | null
  averageScore: number
  totalIndicators: number
  answeredIndicators: number
}

export interface AssessmentSummary {
  assessmentId: string
  schoolName: string
  academicYearName: string
  semesterName?: string | null
  status: AssessmentStatus
  submittedAt?: Date | null
  domainScores: DomainScore[]
  overallScore: number
}

export interface ComparisonData {
  year: string
  semester?: string
  domainScores: {
    [groupName: string]: number
  }
  overallScore: number
}

export interface DashboardFilters {
  schoolId?: string
  networkId?: string
  officeId?: string
  academicYearId?: string
  semesterId?: string
  status?: AssessmentStatus
}
