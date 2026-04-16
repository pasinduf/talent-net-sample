import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { AuditAction } from '@talent-net/types';
import { AuditLog, ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler.js';
import { ok } from '../../shared/response.js';
import { NotFoundError } from '../../shared/errors.js';
import { db } from '../../shared/db.js';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = { id: '595ee204-5f8f-4737-9e55-95cd8cda1b5b' }; // requireRoles(event, UserRole.HR_ADMIN);

  const jobId = event.pathParameters?.jobId;
  if (!jobId) throw new NotFoundError('Job');

  const dataSource = await db();
  const scoringRepo = new ScoringConfigRepository(dataSource);
  const auditRepo = dataSource.getRepository(AuditLog);

  const config = await scoringRepo.findByJobId(jobId);
  if (!config) throw new NotFoundError('ScoringConfig');

  const configId = config.id;
  await scoringRepo.remove(config);

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.SCORING_CONFIG_UPDATED,
      entityType: 'ScoringConfig',
      entityId: configId,
      actorId: actor.id,
      newState: { deleted: true, jobId },
    })
  );

  return ok({ deleted: true });
}

export const handler = withErrorHandler(handle);
