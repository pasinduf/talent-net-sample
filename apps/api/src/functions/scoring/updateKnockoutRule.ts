import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import { UserRole, AuditAction, KnockoutCondition, KnockoutAction } from '@talent-net/types';
import { KnockoutRule, AuditLog, ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler, parseBody } from '../../middleware/handler';
import { requireRoles } from '../../middleware/auth';
import { ok } from '../../shared/response';
import { NotFoundError } from '../../shared/errors';
import { db } from '../../shared/db';

const UpdateKnockoutRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  condition: z.nativeEnum(KnockoutCondition).optional(),
  conditionValue: z.string().nullable().optional(),
  action: z.nativeEnum(KnockoutAction).optional(),
  errorMessage: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

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

  const body = parseBody(event);
  const input = UpdateKnockoutRuleSchema.parse(body);

  if (input.name !== undefined) rule.name = input.name;
  if (input.condition !== undefined) rule.condition = input.condition;
  if (input.conditionValue !== undefined) rule.conditionValue = input.conditionValue;
  if (input.action !== undefined) rule.action = input.action;
  if (input.errorMessage !== undefined) rule.errorMessage = input.errorMessage;
  if (input.description !== undefined) rule.description = input.description;
  if (input.isActive !== undefined) rule.isActive = input.isActive;

  const saved = await ruleRepo.save(rule);

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.SCORING_CONFIG_UPDATED,
      entityType: 'KnockoutRule',
      entityId: saved.id,
      actorId: actor.id,
      newState: { condition: saved.condition, action: saved.action, isActive: saved.isActive },
    })
  );

  return ok({
    id: saved.id,
    scoringConfigId: saved.scoringConfigId,
    name: saved.name,
    condition: saved.condition,
    conditionValue: saved.conditionValue,
    action: saved.action,
    errorMessage: saved.errorMessage,
    description: saved.description,
    isActive: saved.isActive,
  });
}

export const handler = withErrorHandler(handle);
