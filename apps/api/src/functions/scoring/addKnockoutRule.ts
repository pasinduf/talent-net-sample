import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import { UserRole, AuditAction, KnockoutCondition, KnockoutAction } from '@talent-net/types';
import { KnockoutRule, AuditLog, ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler, parseBody } from '../../middleware/handler.js';
import { requireRoles } from '../../middleware/auth.js';
import { created } from '../../shared/response.js';
import { NotFoundError } from '../../shared/errors.js';
import { db } from '../../shared/db.js';

const AddKnockoutRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  condition: z.nativeEnum(KnockoutCondition),
  conditionValue: z.string().min(1).max(500),
  action: z.nativeEnum(KnockoutAction),
  errorMessage: z.string().min(1),
  isActive: z.boolean().default(true),
});

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = requireRoles(event, UserRole.HR_ADMIN);

  const jobId = event.pathParameters?.jobId;
  if (!jobId) throw new NotFoundError('Job');

  const body = parseBody(event);
  const input = AddKnockoutRuleSchema.parse(body);

  const dataSource = await db();
  const scoringRepo = new ScoringConfigRepository(dataSource);
  const ruleRepo = dataSource.getRepository(KnockoutRule);
  const auditRepo = dataSource.getRepository(AuditLog);

  const config = await scoringRepo.findByJobId(jobId);
  if (!config) throw new NotFoundError('ScoringConfig');

  const rule = ruleRepo.create({
    scoringConfigId: config.id,
    name: input.name,
    description: input.description ?? null,
    condition: input.condition,
    conditionValue: input.conditionValue,
    action: input.action,
    errorMessage: input.errorMessage,
    isActive: input.isActive,
  });

  const saved = await ruleRepo.save(rule);

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.SCORING_CONFIG_UPDATED,
      entityType: 'KnockoutRule',
      entityId: saved.id,
      actorId: actor.id,
      newState: {
        action: 'knockout_rule_added',
        jobId,
        ruleName: saved.name,
        condition: saved.condition,
        knockoutAction: saved.action,
      },
    })
  );

  return created({
    id: saved.id,
    scoringConfigId: saved.scoringConfigId,
    name: saved.name,
    description: saved.description,
    condition: saved.condition,
    conditionValue: saved.conditionValue,
    action: saved.action,
    errorMessage: saved.errorMessage,
    isActive: saved.isActive,
    createdAt: saved.createdAt,
  });
}

export const handler = withErrorHandler(handle);
