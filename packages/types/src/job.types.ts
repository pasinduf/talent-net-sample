import {
  EmploymentType,
  ExperienceLevel,
  InterviewType,
  JobStatus,
  QuestionType,
} from './enums';

export interface CreateJobDto {
  title: string;
  description: string;
  department: string;
  employmentType: EmploymentType;
  level: ExperienceLevel;
  location: string;
  isRemote: boolean;
  applicationDeadline?: string;
  interviewTypes: InterviewType[];
  headcount?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
}

export interface UpdateJobDto extends Partial<CreateJobDto> {}

export interface PublishJobDto {
  publishedAt?: string;
}

export interface JobFilters {
  status?: JobStatus;
  department?: string;
  level?: ExperienceLevel;
  employmentType?: EmploymentType;
  isRemote?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface JobSummary {
  id: string;
  title: string;
  department: string;
  level: ExperienceLevel;
  employmentType: EmploymentType;
  location: string;
  isRemote: boolean;
  status: JobStatus;
  applicationDeadline: string | null;
  applicationCount: number;
  publishedAt: string | null;
  createdAt: string;
}

export interface JobDetail extends JobSummary {
  description: string;
  interviewTypes: InterviewType[];
  headcount: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  slug: string;
  screeningQuestions: ScreeningQuestionDto[];
  hasScoringConfig: boolean;
  updatedAt: string;
}

export interface ScreeningQuestionDto {
  id: string;
  question: string;
  type: QuestionType;
  isRequired: boolean;
  isKnockout: boolean;
  options?: string[];
  order: number;
  helpText?: string;
}

export interface CreateScreeningQuestionDto {
  question: string;
  type: QuestionType;
  isRequired: boolean;
  isKnockout: boolean;
  options?: string[];
  order: number;
  helpText?: string;
}
