import {
  EmploymentType,
  ExperienceLevel,
  InterviewType,
  QuestionType,
  DimensionType,
  EvaluationPhase,
  KnockoutCondition,
} from './enums';

export const DEPARTMENTS = [
  'Engineering', 'Design', 'Data & Analytics', 'Infrastructure', 'Marketing',
  'Human Resources', 'Finance', 'Sales', 'Operations', 'Legal', 'Product',
];

export const EXPERIENCE_LEVELS: Record<ExperienceLevel, string> = {
  [ExperienceLevel.ENTRY]: 'Entry Level',
  [ExperienceLevel.JUNIOR]: 'Junior',
  [ExperienceLevel.MID]: 'Mid Level',
  [ExperienceLevel.SENIOR]: 'Senior',
  [ExperienceLevel.LEAD]: 'Lead',
  [ExperienceLevel.EXECUTIVE]: 'Executive',
};

export const EMPLOYMENT_TYPES: Record<EmploymentType, string> = {
  [EmploymentType.FULL_TIME]: 'Full-time',
  [EmploymentType.PART_TIME]: 'Part-time',
  [EmploymentType.CONTRACT]: 'Contract',
  [EmploymentType.INTERNSHIP]: 'Internship',
  [EmploymentType.FREELANCE]: 'Freelance',
};

export const INTERVIEW_TYPES: Record<InterviewType, string> = {
  [InterviewType.TAKE_HOME]: 'Take-home Assignment',
  [InterviewType.AI]: 'AI Interview',
  [InterviewType.MANUAL]: 'Manual Interview',
  [InterviewType.HYBRID]: 'Hybrid (AI + Manual)',
};

export const QUESTION_TYPES: Record<QuestionType, string> = {
  [QuestionType.TEXT]: 'Short text',
  [QuestionType.TEXTAREA]: 'Long text',
  [QuestionType.YES_NO]: 'Yes / No',
  [QuestionType.SINGLE_CHOICE]: 'Single choice',
  [QuestionType.MULTI_CHOICE]: 'Multiple choice',
};

export const EVALUATION_PHASES: Record<EvaluationPhase, string> = {
  [EvaluationPhase.PRE_INTERVIEW]: 'Pre-Interview',
  [EvaluationPhase.POST_INTERVIEW]: 'Post-Interview',
  [EvaluationPhase.BOTH]: 'Both Phases',
};

export const DIMENSION_TYPES: Record<DimensionType, string> = {
  [DimensionType.MANDATORY]: 'Mandatory',
  [DimensionType.OPTIONAL]: 'Optional',
  [DimensionType.ADVISORY]: 'Advisory',
  [DimensionType.DISQUALIFYING]: 'Disqualifying',
};

export const DIMENSION_TYPE_HELP: Record<DimensionType, string> = {
  [DimensionType.MANDATORY]: 'Must be scored; contributes to total',
  [DimensionType.OPTIONAL]: 'Scored if possible; contributes to total',
  [DimensionType.ADVISORY]: 'Informational only; does not affect total score',
  [DimensionType.DISQUALIFYING]: 'Failing this dimension flags the candidate for non-progression',
};

export const KNOCKOUT_CONDITIONS: Record<KnockoutCondition, string> = {
  [KnockoutCondition.CERTIFICATION_REQUIRED]: 'Certification Required',
  [KnockoutCondition.WORK_AUTHORIZATION]: 'Work Authorization',
  [KnockoutCondition.LANGUAGE_REQUIREMENT]: 'Language Requirement',
  [KnockoutCondition.AVAILABILITY_REQUIREMENT]: 'Availability Requirement',
  [KnockoutCondition.MINIMUM_EDUCATION]: 'Minimum Education',
  [KnockoutCondition.MINIMUM_EXPERIENCE_YEARS]: 'Min. Years of Experience',
  [KnockoutCondition.LOCATION_REQUIREMENT]: 'Location Requirement',
  [KnockoutCondition.CUSTOM]: 'Custom',
};
