// ─── Generic API Response Shapes ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

// ─── Common Query Params ──────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// ─── Error Codes ──────────────────────────────────────────────────────────────

export enum ErrorCode {
  // Auth
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Resource
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Business logic
  JOB_NOT_IN_DRAFT = 'JOB_NOT_IN_DRAFT',
  JOB_ALREADY_PUBLISHED = 'JOB_ALREADY_PUBLISHED',
  SCORING_CONFIG_EXISTS = 'SCORING_CONFIG_EXISTS',
  WEIGHT_EXCEEDS_LIMIT = 'WEIGHT_EXCEEDS_LIMIT',
  KNOCKOUT_RULE_REQUIRED = 'KNOCKOUT_RULE_REQUIRED',
  APPLICATION_ALREADY_SUBMITTED = 'APPLICATION_ALREADY_SUBMITTED',
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',

  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
