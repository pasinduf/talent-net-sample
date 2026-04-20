import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { UserRole, AuditAction } from '@talent-net/types';
import { KnockoutRule, AuditLog, ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler';
import { requireRoles } from '../../middleware/auth';
import { ok } from '../../shared/response';
import { NotFoundError } from '../../shared/errors';
import { db } from '../../shared/db';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = { id: '595ee204-5f8f-4737-9e55-95cd8cda1b5b' }; // requireRoles(event, UserRole.HR_ADMIN);

  const jobId = event.pathParameters?.jobId;
  const ruleId = event.pathParameters?.ruleId;
  if (!jobId) throw new NotFoundError('Job');
  if (!ruleId) throw new NotFoundError('KnockoutRule');

  const dataSource = await db();
  const scoringRepo = new ScoringConfigRepository(dataSource);
  const ruleRepo = dataSource.getRepository(KnockoutRule);
  const auditRepo = dataSource.getRepository(AuditLog);

  const config = await scoringRepo.findByJobId(jobId);
  if (!config) throw new NotFoundError('ScoringConfig');

  const rule = await ruleRepo.findOne({
    where: { id: ruleId, scoringConfigId: config.id },
  });
  if (!rule) throw new NotFoundError('KnockoutRule');

  await ruleRepo.remove(rule);

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.SCORING_CONFIG_UPDATED,
      entityType: 'KnockoutRule',
      entityId: ruleId,
      actorId: actor.id,
      previousState: { condition: rule.condition, action: rule.action },
      newState: { deleted: true },
    })
  );

  return ok({ removed: ruleId });
}

export const handler = withErrorHandler(handle);
