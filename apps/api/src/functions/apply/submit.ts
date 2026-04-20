import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import {
  Job,
  Candidate,
  Application,
  ApplicationAnswer,
  ConsentRecord,
} from '@talent-net/database';
import {
  UserRole,
  ApplicationStatus,
  ConsentPurpose,
  JobStatus,
  ErrorCode,
} from '@talent-net/types';
import { withErrorHandler, parseBody } from '../../middleware/handler';
import { created } from '../../shared/response';
import { NotFoundError, BusinessError } from '../../shared/errors';
import { requireRoles } from '../../middleware/auth';
import { db } from '../../shared/db';

// ─── Input schema ─────────────────────────────────────────────────────────────

const AnswerSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().max(5000).nullable().optional(),
  answerOptions: z.array(z.string().max(500)).nullable().optional(),
});

const ConsentSchema = z.object({
  purpose: z.nativeEnum(ConsentPurpose),
  isGranted: z.boolean(),
});

const ProfileSchema = z.object({
  phone: z.string().max(30).nullable().optional(),
  city: z.string().max(255).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  linkedInUrl: z.string().url().max(500).nullable().optional(),
  gitHubUrl: z.string().url().max(500).nullable().optional(),
  portfolioUrl: z.string().url().max(500).nullable().optional(),
  websiteUrl: z.string().url().max(500).nullable().optional(),
});

const BodySchema = z.object({
  /** Cloudinary secure URL of the uploaded resume. */
  resumeUrl: z.string().url().nullable().optional(),
  /** Additional profile fields to upsert on the Candidate record. */
  profile: ProfileSchema.optional(),
  /** Answers to the role's screening questions. */
  answers: z.array(AnswerSchema).default([]),
  /** Consent statements the candidate acknowledged. */
  consents: z.array(ConsentSchema).min(1, 'At least one consent record is required'),
});

/**
 * POST /public/jobs/{slug}/apply
 *
 * Submits a job application for the authenticated candidate.
 * - Creates Application + ApplicationAnswer + ConsentRecord rows.
 * - Upserts profile fields on the Candidate record.
 * - Flags possible duplicate applications within the same job.
 *
 * Requires: candidate JWT (role = APPLICANT)
 */
async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = requireRoles(event, UserRole.APPLICANT);

  const slug = event.pathParameters?.slug;
  if (!slug) throw new NotFoundError('Job');

  const body = parseBody(event);
  const input = BodySchema.parse(body);

  // APPLICATION_PROCESSING consent is mandatory
  const processingConsent = input.consents.find(
    (c) => c.purpose === ConsentPurpose.APPLICATION_PROCESSING
  );
  if (!processingConsent?.isGranted) {
    throw new BusinessError(
      ErrorCode.CONSENT_REQUIRED,
      'You must consent to application data processing before submitting'
    );
  }

  const dataSource = await db();
  const jobRepo = dataSource.getRepository(Job);
  const candidateRepo = dataSource.getRepository(Candidate);
  const applicationRepo = dataSource.getRepository(Application);
  const answerRepo = dataSource.getRepository(ApplicationAnswer);
  const consentRepo = dataSource.getRepository(ConsentRecord);

  // ── Load & validate job ───────────────────────────────────────────────────

  const job = await jobRepo.findOne({
    where: { slug },
    relations: ['applicationForm', 'applicationForm.screeningQuestions'],
  });

  if (!job) throw new NotFoundError('Job');

  if (job.status !== JobStatus.PUBLISHED) {
    throw new BusinessError(
      ErrorCode.INVALID_STATUS_TRANSITION,
      'This job is not currently accepting applications'
    );
  }

  if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
    throw new BusinessError(
      ErrorCode.CONFLICT,
      'The application deadline for this role has passed'
    );
  }

  // ── Load candidate ────────────────────────────────────────────────────────

  const candidate = await candidateRepo.findOne({ where: { id: actor.id } });
  if (!candidate) throw new NotFoundError('Candidate');

  // ── Duplicate application guard ───────────────────────────────────────────

  const existing = await applicationRepo.findOne({
    where: { jobId: job.id, candidateId: candidate.id },
  });
  if (existing) {
    throw new BusinessError(
      ErrorCode.APPLICATION_ALREADY_SUBMITTED,
      'You have already submitted an application for this role'
    );
  }

  // ── Upsert candidate profile ──────────────────────────────────────────────

  if (input.profile) {
    const p = input.profile;
    if (p.phone !== undefined) candidate.phone = p.phone ?? null;
    if (p.city !== undefined) candidate.city = p.city ?? null;
    if (p.country !== undefined) candidate.country = p.country ?? null;
    if (p.linkedInUrl !== undefined) candidate.linkedInUrl = p.linkedInUrl ?? null;
    if (p.gitHubUrl !== undefined) candidate.gitHubUrl = p.gitHubUrl ?? null;
    if (p.portfolioUrl !== undefined) candidate.portfolioUrl = p.portfolioUrl ?? null;
    if (p.websiteUrl !== undefined) candidate.websiteUrl = p.websiteUrl ?? null;
  }

  // Store resume URL (Cloudinary) in candidate's canonical profile
  if (input.resumeUrl) {
    candidate.resumeS3Key = input.resumeUrl;
  }

  await candidateRepo.save(candidate);

  // ── Create Application ────────────────────────────────────────────────────

  const application = await applicationRepo.save(
    applicationRepo.create({
      jobId: job.id,
      candidateId: candidate.id,
      status: ApplicationStatus.APPLIED,
      submittedAt: new Date(),
      resumeS3Key: input.resumeUrl ?? candidate.resumeS3Key,
      source: 'careers_portal',
    })
  );

  // ── Save screening answers ────────────────────────────────────────────────

  if (input.answers.length > 0 && job.applicationForm?.screeningQuestions?.length) {
    const validQuestionIds = new Set(
      job.applicationForm.screeningQuestions.map((q) => q.id)
    );

    const answersToSave = input.answers
      .filter((a) => validQuestionIds.has(a.questionId))
      .map((a) =>
        answerRepo.create({
          applicationId: application.id,
          screeningQuestionId: a.questionId,
          answerText: a.answerText ?? null,
          answerOptions: a.answerOptions ?? null,
        })
      );

    if (answersToSave.length > 0) {
      await answerRepo.save(answersToSave);
    }
  }

  // ── Record consents ───────────────────────────────────────────────────────

  const ipAddress = event.requestContext?.http?.sourceIp ?? null;
  const userAgent = (event.headers?.['user-agent'] ?? event.headers?.['User-Agent']) ?? null;

  await consentRepo.save(
    input.consents.map((c) =>
      consentRepo.create({
        candidateId: candidate.id,
        applicationId: application.id,
        purpose: c.purpose,
        isGranted: c.isGranted,
        ipAddress,
        userAgent,
        consentVersion: '1.0',
      })
    )
  );

  // ── Flag possible duplicates (same email, same job, different application) ─

  const possibleDuplicate = await applicationRepo
    .createQueryBuilder('app')
    .innerJoin('app.candidate', 'cand')
    .where('app.jobId = :jobId', { jobId: job.id })
    .andWhere('cand.email = :email', { email: candidate.email })
    .andWhere('app.id != :appId', { appId: application.id })
    .getOne();

  if (possibleDuplicate) {
    application.isPossibleDuplicate = true;
    application.duplicateOfApplicationId = possibleDuplicate.id;
    await applicationRepo.save(application);
  }

  return created({
    applicationId: application.id,
    jobTitle: job.title,
    jobSlug: job.slug,
    submittedAt: application.submittedAt,
  });
}

export const handler = withErrorHandler(handle);
