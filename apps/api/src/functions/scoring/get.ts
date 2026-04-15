import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { UserRole } from '@talent-net/types';
import { ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler.js';
import { requireRoles } from '../../middleware/auth.js';
import { ok } from '../../shared/response.js';
import { NotFoundError } from '../../shared/errors.js';
import { db } from '../../shared/db.js';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = requireRoles(
    event,
    UserRole.HR_ADMIN,
    UserRole.HIRING_MANAGER,
    UserRole.SYSTEM_SUPERVISOR
  );

  const jobId = event.pathParameters?.jobId;
  if (!jobId) throw new NotFoundError('Job');

  const dataSource = await db();
  const scoringRepo = new ScoringConfigRepository(dataSource);

  const config = await scoringRepo.findByJobId(jobId);
  if (!config) throw new NotFoundError('ScoringConfig');

  // For non-HR roles, filter out dimensions marked as restricted
  const isHR = actor.role === UserRole.HR_ADMIN || actor.role === UserRole.SYSTEM_SUPERVISOR;
  const dimensions = isHR
    ? config.evaluationDimensions
    : config.evaluationDimensions.filter((d) => d.isVisibleToAllReviewers);

  return ok({
    id: config.id,
    jobId: config.jobId,
    totalScaleMax: config.totalScaleMax,
    preInterviewWeight: Number(config.preInterviewWeight),
    postInterviewWeight: Number(config.postInterviewWeight),
    shortlistThreshold: Number(config.shortlistThreshold),
    passThreshold: Number(config.passThreshold),
    manualReviewThreshold: Number(config.manualReviewThreshold),
    isTemplate: config.isTemplate,
    templateName: config.templateName,
    totalWeightUsed: config.totalWeightUsed,
    isWeightBalanced: config.isWeightBalanced,
    evaluationDimensions: dimensions.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      weight: Number(d.weight),
      type: d.type,
      phase: d.phase,
      minimumThreshold: d.minimumThreshold !== null ? Number(d.minimumThreshold) : null,
      isVisibleToAllReviewers: d.isVisibleToAllReviewers,
      order: d.order,
    })),
    knockoutRules: config.knockoutRules.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      condition: r.condition,
      conditionValue: r.conditionValue,
      action: r.action,
      errorMessage: r.errorMessage,
      isActive: r.isActive,
    })),
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  });
}

export const handler = withErrorHandler(handle);
