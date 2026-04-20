import {
  DimensionType,
  EvaluationPhase,
  KnockoutAction,
  KnockoutCondition,
} from './enums';

export interface CreateEvaluationDimensionDto {
  name: string;
  description?: string;
  weight: number;
  type: DimensionType;
  phase: EvaluationPhase;
  minimumThreshold?: number;
  isVisibleToAllReviewers: boolean;
  order: number;
}

export interface UpdateEvaluationDimensionDto extends Partial<CreateEvaluationDimensionDto> {}

export interface EvaluationDimensionDto {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  type: DimensionType;
  phase: EvaluationPhase;
  minimumThreshold: number | null;
  isVisibleToAllReviewers: boolean;
  order: number;
}

export interface CreateKnockoutRuleDto {
  name: string;
  description?: string;
  condition: KnockoutCondition;
  conditionValue: string;
  action: KnockoutAction;
  errorMessage: string;
}

export interface UpdateKnockoutRuleDto extends Partial<CreateKnockoutRuleDto> {}

export interface KnockoutRuleDto {
  id: string;
  name: string;
  description: string | null;
  condition: KnockoutCondition;
  conditionValue: string;
  action: KnockoutAction;
  errorMessage: string;
}

export interface CreateScoringConfigDto {
  totalScaleMax: number;
  preInterviewWeight: number;
  postInterviewWeight: number;
  shortlistThreshold: number;
  passThreshold: number;
  manualReviewThreshold: number;
  isTemplate?: boolean;
  templateName?: string;
  evaluationDimensions?: CreateEvaluationDimensionDto[];
  knockoutRules?: CreateKnockoutRuleDto[];
}

export interface UpdateScoringConfigDto {
  totalScaleMax?: number;
  preInterviewWeight?: number;
  postInterviewWeight?: number;
  shortlistThreshold?: number;
  passThreshold?: number;
  manualReviewThreshold?: number;
  templateName?: string;
}

export interface ScoringConfigDto {
  id: string;
  jobId: string;
  totalScaleMax: number;
  preInterviewWeight: number;
  postInterviewWeight: number;
  shortlistThreshold: number;
  passThreshold: number;
  manualReviewThreshold: number;
  isTemplate: boolean;
  templateName: string | null;
  evaluationDimensions: EvaluationDimensionDto[];
  knockoutRules: KnockoutRuleDto[];
  totalWeightUsed: number;
  isWeightBalanced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScoringTemplateDto {
  id: string;
  templateName: string;
  totalScaleMax: number;
  evaluationDimensions: EvaluationDimensionDto[];
  knockoutRules: KnockoutRuleDto[];
}

export interface DimensionScore {
  dimensionId: string;
  dimensionName: string;
  rawScore: number;
  weightedScore: number;
  weight: number;
  phase: EvaluationPhase;
  notes?: string;
}

export interface CandidateScoreDto {
  applicationId: string;
  totalScore: number;
  preInterviewScore: number;
  postInterviewScore: number;
  confidenceLevel: number;
  dimensionScores: DimensionScore[];
  knockoutFlags: KnockoutFlagDto[];
  aiSummary?: string;
  strengthSummary?: string;
  concernSummary?: string;
  openQuestions?: string;
  recommendation?: string;
  isAiGenerated: boolean;
  isOverridden: boolean;
  overrideReason?: string;
  scoredAt: string;
}

export interface KnockoutFlagDto {
  ruleId: string;
  ruleName: string;
  condition: KnockoutCondition;
  action: KnockoutAction;
  isFlagged: boolean;
}
