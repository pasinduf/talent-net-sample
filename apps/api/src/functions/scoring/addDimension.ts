import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import { UserRole, AuditAction, ErrorCode, DimensionType, EvaluationPhase } from '@talent-net/types';
import { EvaluationDimension, AuditLog, ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler, parseBody } from '../../middleware/handler';
import { requireRoles } from '../../middleware/auth';
import { created } from '../../shared/response';
import { NotFoundError, BusinessError } from '../../shared/errors';
import { db } from '../../shared/db';

const AddDimensionSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  weight: z.number().min(0.01).max(100),
  type: z.nativeEnum(DimensionType),
  phase: z.nativeEnum(EvaluationPhase),
  minimumThreshold: z.number().min(0).max(100).optional(),
  isVisibleToAllReviewers: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = { id: '595ee204-5f8f-4737-9e55-95cd8cda1b5b' }; //requireRoles(event, UserRole.HR_ADMIN);

  const jobId = event.pathParameters?.jobId;
  if (!jobId) throw new NotFoundError('Job');

  const body = parseBody(event);
  const input = AddDimensionSchema.parse(body);

  const dataSource = await db();
  const scoringRepo = new ScoringConfigRepository(dataSource);
  const dimRepo = dataSource.getRepository(EvaluationDimension);
  const auditRepo = dataSource.getRepository(AuditLog);

  const config = await scoringRepo.findByJobId(jobId);
  if (!config) throw new NotFoundError('ScoringConfig');

  // Guard: Adding this dimension must not push total weight past 100%
  const currentTotal = config.totalWeightUsed;
  const newTotal = currentTotal + input.weight;
  if (newTotal > 100.01) {
    throw new BusinessError(
      ErrorCode.WEIGHT_EXCEEDS_LIMIT,
      `Adding this dimension (${input.weight}%) would bring total weight to ${newTotal.toFixed(2)}%. Maximum is 100%.`
    );
  }

  const dimension = dimRepo.create({
    scoringConfigId: config.id,
    name: input.name,
    description: input.description ?? null,
    weight: input.weight,
    type: input.type,
    phase: input.phase,
    minimumThreshold: input.minimumThreshold ?? null,
    isVisibleToAllReviewers: input.isVisibleToAllReviewers,
    order: input.order,
  });

  const saved = await dimRepo.save(dimension);

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.SCORING_CONFIG_UPDATED,
      entityType: 'EvaluationDimension',
      entityId: saved.id,
      actorId: actor.id,
      newState: {
        action: 'dimension_added',
        jobId,
        dimensionName: saved.name,
        weight: saved.weight,
        phase: saved.phase,
        newTotalWeight: newTotal,
      },
    })
  );

  return created({
    id: saved.id,
    scoringConfigId: saved.scoringConfigId,
    name: saved.name,
    description: saved.description,
    weight: Number(saved.weight),
    type: saved.type,
    phase: saved.phase,
    minimumThreshold: saved.minimumThreshold !== null ? Number(saved.minimumThreshold) : null,
    isVisibleToAllReviewers: saved.isVisibleToAllReviewers,
    order: saved.order,
    newTotalWeightUsed: newTotal,
    isWeightBalanced: Math.abs(newTotal - 100) < 0.01,
  });
}

export const handler = withErrorHandler(handle);
