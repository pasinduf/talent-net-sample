import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { UserRole, JobStatus, AuditAction, ErrorCode } from '@talent-net/types';
import { Job, AuditLog, JobRepository, ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler.js';
import { requireRoles } from '../../middleware/auth.js';
import { ok } from '../../shared/response.js';
import { NotFoundError, BusinessError } from '../../shared/errors.js';
import { db } from '../../shared/db.js';

/**
 * Publishes a Job.
 *
 * Business rules enforced:
 * 1. Job must be in DRAFT or PAUSED state.
 * 2. Job must have a ScoringConfig with at least one EvaluationDimension.
 * 3. ScoringConfig weights must sum to 100%.
 */
async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = { id: '595ee204-5f8f-4737-9e55-95cd8cda1b5b' }; // requireRoles(event, UserRole.HR_ADMIN);

  const id = event.pathParameters?.id;
  if (!id) throw new NotFoundError('Job');

  const dataSource = await db();
  const jobRepo = new JobRepository(dataSource);
  const scoringRepo = new ScoringConfigRepository(dataSource);
  const auditRepo = dataSource.getRepository(AuditLog);

  const job = await jobRepo.findWithFullDetail(id);
  if (!job) throw new NotFoundError('Job');

  // Rule 1: State check
  if (job.status !== JobStatus.DRAFT && job.status !== JobStatus.PAUSED) {
    throw new BusinessError(
      ErrorCode.JOB_ALREADY_PUBLISHED,
      `Cannot publish a job in '${job.status}' status`
    );
  }

  // Rule 2 & 3: Scoring config validation
  const scoring = await scoringRepo.findByJobId(id);
  if (!scoring || scoring.evaluationDimensions.length === 0) {
    throw new BusinessError(
      ErrorCode.JOB_NOT_IN_DRAFT,
      'Job must have a scoring configuration with at least one evaluation dimension before publishing'
    );
  }

  const { isValid, errors } = await scoringRepo.validateWeights(scoring.id);
  if (!isValid) {
    throw new BusinessError(
      ErrorCode.WEIGHT_EXCEEDS_LIMIT,
      `Scoring configuration is invalid: ${errors.join('; ')}`
    );
  }

  const previousStatus = job.status;
  job.status = JobStatus.PUBLISHED;
  job.publishedAt = job.publishedAt ?? new Date();

  await jobRepo.save(job);

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.JOB_PUBLISHED,
      entityType: 'Job',
      entityId: job.id,
      actorId: actor.id,
      previousState: { status: previousStatus },
      newState: { status: JobStatus.PUBLISHED, publishedAt: job.publishedAt },
    })
  );

  return ok({
    id: job.id,
    status: job.status,
    publishedAt: job.publishedAt,
  });
}

export const handler = withErrorHandler(handle);
