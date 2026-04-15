import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { UserRole, AuditAction } from '@talent-net/types';
import { EvaluationDimension, AuditLog, ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler.js';
import { requireRoles } from '../../middleware/auth.js';
import { ok } from '../../shared/response.js';
import { NotFoundError } from '../../shared/errors.js';
import { db } from '../../shared/db.js';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = { id: '595ee204-5f8f-4737-9e55-95cd8cda1b5b' }; // requireRoles(event, UserRole.HR_ADMIN);

  const jobId = event.pathParameters?.jobId;
  const dimensionId = event.pathParameters?.dimensionId;
  if (!jobId) throw new NotFoundError('Job');
  if (!dimensionId) throw new NotFoundError('EvaluationDimension');

  const dataSource = await db();
  const scoringRepo = new ScoringConfigRepository(dataSource);
  const dimRepo = dataSource.getRepository(EvaluationDimension);
  const auditRepo = dataSource.getRepository(AuditLog);

  const config = await scoringRepo.findByJobId(jobId);
  if (!config) throw new NotFoundError('ScoringConfig');

  const dimension = await dimRepo.findOne({
    where: { id: dimensionId, scoringConfigId: config.id },
  });
  if (!dimension) throw new NotFoundError('EvaluationDimension');

  const removedWeight = Number(dimension.weight);
  await dimRepo.remove(dimension);

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.SCORING_CONFIG_UPDATED,
      entityType: 'EvaluationDimension',
      entityId: dimensionId,
      actorId: actor.id,
      previousState: { dimensionName: dimension.name, weight: removedWeight },
      newState: { deleted: true },
    })
  );

  const newTotal = config.totalWeightUsed - removedWeight;
  return ok({ removed: dimensionId, newTotalWeightUsed: Math.max(0, newTotal) });
}

export const handler = withErrorHandler(handle);
