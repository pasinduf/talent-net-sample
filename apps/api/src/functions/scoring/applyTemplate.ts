import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { UserRole, AuditAction } from '@talent-net/types';
import { AuditLog, JobRepository, ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler.js';
import { requireRoles } from '../../middleware/auth.js';
import { ok } from '../../shared/response.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';
import { db } from '../../shared/db.js';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = { id: '595ee204-5f8f-4737-9e55-95cd8cda1b5b' };// requireRoles(event, UserRole.HR_ADMIN);

  const jobId = event.pathParameters?.jobId;
  const templateId = event.pathParameters?.templateId;
  if (!jobId || !templateId) throw new NotFoundError('Job or Template');

  const dataSource = await db();
  const jobRepo = new JobRepository(dataSource);
  const scoringRepo = new ScoringConfigRepository(dataSource);
  const auditRepo = dataSource.getRepository(AuditLog);

  const job = await jobRepo.findOne({ where: { id: jobId } });
  if (!job) throw new NotFoundError('Job');

  const existing = await scoringRepo.findByJobId(jobId);
  if (existing) {
    throw new ConflictError(
      'This job already has a scoring configuration. Delete it first or update it in place.'
    );
  }

  const cloned = await scoringRepo.cloneFromTemplate(templateId, jobId);

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.SCORING_CONFIG_CREATED,
      entityType: 'ScoringConfig',
      entityId: cloned.id,
      actorId: actor.id,
      newState: {
        action: 'cloned_from_template',
        templateId,
        jobId,
        dimensionCount: cloned.evaluationDimensions.length,
      },
    })
  );

  return ok({
    id: cloned.id,
    jobId: cloned.jobId,
    totalScaleMax: cloned.totalScaleMax,
    preInterviewWeight: Number(cloned.preInterviewWeight),
    postInterviewWeight: Number(cloned.postInterviewWeight),
    shortlistThreshold: Number(cloned.shortlistThreshold),
    passThreshold: Number(cloned.passThreshold),
    manualReviewThreshold: Number(cloned.manualReviewThreshold),
    isTemplate: false,
    totalWeightUsed: cloned.totalWeightUsed,
    isWeightBalanced: cloned.isWeightBalanced,
    evaluationDimensions: cloned.evaluationDimensions,
    knockoutRules: cloned.knockoutRules,
  });
}

export const handler = withErrorHandler(handle);
