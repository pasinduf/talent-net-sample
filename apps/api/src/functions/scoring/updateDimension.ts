import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import { UserRole, AuditAction, ErrorCode, DimensionType, EvaluationPhase } from '@talent-net/types';
import { EvaluationDimension, AuditLog, ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler, parseBody } from '../../middleware/handler.js';
import { requireRoles } from '../../middleware/auth.js';
import { ok } from '../../shared/response.js';
import { NotFoundError, BusinessError } from '../../shared/errors.js';
import { db } from '../../shared/db.js';

const UpdateDimensionSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().nullable().optional(),
  weight: z.number().min(0.01).max(100).optional(),
  type: z.nativeEnum(DimensionType).optional(),
  phase: z.nativeEnum(EvaluationPhase).optional(),
  minimumThreshold: z.number().min(0).max(100).nullable().optional(),
  isVisibleToAllReviewers: z.boolean().optional(),
  scoringGuidance: z.string().nullable().optional(),
  order: z.number().int().min(0).optional(),
});

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = requireRoles(event, UserRole.HR_ADMIN);

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

  const body = parseBody(event);
  const input = UpdateDimensionSchema.parse(body);

  // If weight is being changed, verify the new total won't exceed 100%
  if (input.weight !== undefined && input.weight !== Number(dimension.weight)) {
    const currentTotal = config.totalWeightUsed;
    const newTotal = currentTotal - Number(dimension.weight) + input.weight;
    if (newTotal > 100.01) {
      throw new BusinessError(
        ErrorCode.WEIGHT_EXCEEDS_LIMIT,
        `Changing this dimension's weight to ${input.weight}% would bring total to ${newTotal.toFixed(2)}%. Maximum is 100%.`
      );
    }
  }

  const previousWeight = dimension.weight;
  if (input.name !== undefined) dimension.name = input.name;
  if (input.description !== undefined) dimension.description = input.description;
  if (input.weight !== undefined) dimension.weight = input.weight;
  if (input.type !== undefined) dimension.type = input.type;
  if (input.phase !== undefined) dimension.phase = input.phase;
  if (input.minimumThreshold !== undefined) dimension.minimumThreshold = input.minimumThreshold;
  if (input.isVisibleToAllReviewers !== undefined) dimension.isVisibleToAllReviewers = input.isVisibleToAllReviewers;
  if (input.scoringGuidance !== undefined) dimension.scoringGuidance = input.scoringGuidance;
  if (input.order !== undefined) dimension.order = input.order;

  const saved = await dimRepo.save(dimension);

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.SCORING_CONFIG_UPDATED,
      entityType: 'EvaluationDimension',
      entityId: saved.id,
      actorId: actor.id,
      previousState: { weight: previousWeight, name: saved.name },
      newState: { weight: saved.weight, name: saved.name },
    })
  );

  return ok({
    id: saved.id,
    scoringConfigId: saved.scoringConfigId,
    name: saved.name,
    description: saved.description,
    weight: Number(saved.weight),
    type: saved.type,
    phase: saved.phase,
    minimumThreshold: saved.minimumThreshold !== null ? Number(saved.minimumThreshold) : null,
    isVisibleToAllReviewers: saved.isVisibleToAllReviewers,
    scoringGuidance: saved.scoringGuidance,
    order: saved.order,
  });
}

export const handler = withErrorHandler(handle);
