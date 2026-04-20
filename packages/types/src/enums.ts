
export enum UserRole {
  APPLICANT = 'applicant',
  HR_ADMIN = 'hr_admin',
  HIRING_MANAGER = 'hiring_manager',
  INTERVIEWER = 'interviewer',
  SYSTEM_SUPERVISOR = 'system_supervisor',
}

export enum JobStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  PAUSED = 'paused',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
  FREELANCE = 'freelance',
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
  EXECUTIVE = 'executive',
}

export enum InterviewType {
  MANUAL = 'manual',
  AI = 'ai',
  HYBRID = 'hybrid',
  TAKE_HOME = 'take_home'
}


export enum DimensionType {
  MANDATORY = 'mandatory',
  OPTIONAL = 'optional',
  ADVISORY = 'advisory',
  DISQUALIFYING = 'disqualifying',
}

export enum EvaluationPhase {
  PRE_INTERVIEW = 'pre_interview',
  POST_INTERVIEW = 'post_interview',
  BOTH = 'both',
}

export enum KnockoutCondition {
  CERTIFICATION_REQUIRED = 'certification_required',
  WORK_AUTHORIZATION = 'work_authorization',
  LANGUAGE_REQUIREMENT = 'language_requirement',
  AVAILABILITY_REQUIREMENT = 'availability_requirement',
  MINIMUM_EDUCATION = 'minimum_education',
  MINIMUM_EXPERIENCE_YEARS = 'minimum_experience_years',
  LOCATION_REQUIREMENT = 'location_requirement',
  CUSTOM = 'custom',
}

export enum KnockoutAction {
  REJECTION_REVIEW = 'rejection_review',
  NON_PROGRESSION = 'non_progression',
  MANUAL_REVIEW_REQUIRED = 'manual_review_required',
}


export enum ApplicationStatus {
  APPLIED = 'applied',
  UNDER_REVIEW = 'under_review',
  SHORTLISTED = 'shortlisted',
  INTERVIEW_PENDING = 'interview_pending',
  INTERVIEW_COMPLETED = 'interview_completed',
  HOLD = 'hold',
  REJECTED = 'rejected',
  TALENT_POOL = 'talent_pool',
  OFFER_STAGE = 'offer_stage',
  CLOSED = 'closed',
  WITHDRAWN = 'withdrawn',
}

export enum QuestionType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  SINGLE_CHOICE = 'single_choice',
  MULTI_CHOICE = 'multi_choice',
  YES_NO = 'yes_no',
}


export enum InterviewStatus {
  PENDING_INVITE = 'pending_invite',
  INVITED = 'invited',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
}

export enum InterviewOutcome {
  PROGRESSED = 'progressed',
  HOLD = 'hold',
  REPEAT_INTERVIEW = 'repeat_interview',
  REJECTED = 'rejected',
  FINAL_REVIEW = 'final_review',
  PENDING = 'pending',
}

export enum IntegritySignalSeverity {
  INFORMATIONAL = 'informational',
  REVIEW_REQUIRED = 'review_required',
  ESCALATION_REQUIRED = 'escalation_required',
}


export enum NotificationType {
  APPLICATION_CONFIRMATION = 'application_confirmation',
  APPLICATION_UNDER_REVIEW = 'application_under_review',
  SHORTLIST_NOTIFICATION = 'shortlist_notification',
  AI_INTERVIEW_INVITATION = 'ai_interview_invitation',
  MANUAL_INTERVIEW_INVITATION = 'manual_interview_invitation',
  INTERVIEW_REMINDER = 'interview_reminder',
  INTERVIEW_CONFIRMATION = 'interview_confirmation',
  INTERVIEW_RESCHEDULE = 'interview_reschedule',
  INTERVIEW_THANK_YOU = 'interview_thank_you',
  REJECTION_NOTICE = 'rejection_notice',
  FUTURE_OPPORTUNITY = 'future_opportunity',
  CONSENT_CONFIRMATION = 'consent_confirmation',
  PREFERENCE_UPDATE = 'preference_update',
  UNSUBSCRIBE_CONFIRMATION = 'unsubscribe_confirmation',
}

export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
}


export enum ConsentPurpose {
  APPLICATION_PROCESSING = 'application_processing',
  FUTURE_OPPORTUNITIES = 'future_opportunities',
  TALENT_COMMUNITY = 'talent_community',
  MARKETING = 'marketing',
}


export enum AuditAction {
  JOB_CREATED = 'job_created',
  JOB_UPDATED = 'job_updated',
  JOB_DELETED = 'job_deleted',
  JOB_PUBLISHED = 'job_published',
  JOB_PAUSED = 'job_paused',
  JOB_CLOSED = 'job_closed',
  JOB_ARCHIVED = 'job_archived',
  SCORING_CONFIG_CREATED = 'scoring_config_created',
  SCORING_CONFIG_UPDATED = 'scoring_config_updated',
  APPLICATION_SUBMITTED = 'application_submitted',
  APPLICATION_STATUS_CHANGED = 'application_status_changed',
  CANDIDATE_SHORTLISTED = 'candidate_shortlisted',
  CANDIDATE_REJECTED = 'candidate_rejected',
  CANDIDATE_POOLED = 'candidate_pooled',
  INTERVIEW_CREATED = 'interview_created',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  SCORE_ADJUSTED = 'score_adjusted',
  AI_RECOMMENDATION_OVERRIDDEN = 'ai_recommendation_overridden',
  CONSENT_GRANTED = 'consent_granted',
  CONSENT_WITHDRAWN = 'consent_withdrawn',
  NOTE_ADDED = 'note_added',
  CANDIDATE_RE_ENGAGED = 'candidate_re_engaged',
  DATA_ANONYMIZED = 'data_anonymized',
  DATA_DELETED = 'data_deleted',
}
