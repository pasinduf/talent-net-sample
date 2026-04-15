import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import {
  UserRole,
  AuditAction,
  ErrorCode,
  DimensionType,
  EvaluationPhase,
  KnockoutCondition,
  KnockoutAction,
} from '@talent-net/types';
import {
  ScoringConfig,
  EvaluationDimension,
  KnockoutRule,
  AuditLog,
  JobRepository,
  ScoringConfigRepository,
} from '@talent-net/database';
import { withErrorHandler, parseBody } from '../../middleware/handler.js';
import { requireRoles } from '../../middleware/auth.js';
import { created } from '../../shared/response.js';
import { NotFoundError, ConflictError, BusinessError } from '../../shared/errors.js';
import { db } from '../../shared/db.js';

const EvaluationDimensionSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  weight: z.number().min(0).max(100),
  type: z.nativeEnum(DimensionType),
  phase: z.nativeEnum(EvaluationPhase),
  minimumThreshold: z.number().min(0).max(100).optional(),
  isVisibleToAllReviewers: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

const KnockoutRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  condition: z.nativeEnum(KnockoutCondition),
  conditionValue: z.string().min(1).max(500),
  action: z.nativeEnum(KnockoutAction),
  errorMessage: z.string().min(1),
});

const CreateScoringConfigSchema = z.object({
  totalScaleMax: z.number().int().min(1).max(1000).default(100),
  preInterviewWeight: z.number().min(0).max(100).default(60),
  postInterviewWeight: z.number().min(0).max(100).default(40),
  shortlistThreshold: z.number().min(0).max(100).default(75),
  passThreshold: z.number().min(0).max(100).default(60),
  manualReviewThreshold: z.number().min(0).max(100).default(40),
  isTemplate: z.boolean().default(false),
  templateName: z.string().max(200).optional(),
  evaluationDimensions: z.array(EvaluationDimensionSchema).optional().default([]),
  knockoutRules: z.array(KnockoutRuleSchema).optional().default([]),
}).refine(
  (d) => Math.abs(d.preInterviewWeight + d.postInterviewWeight - 100) < 0.01,
  { message: 'preInterviewWeight + postInterviewWeight must equal 100' }
);

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = requireRoles(event, UserRole.HR_ADMIN);

  const jobId = event.pathParameters?.jobId;
  if (!jobId) throw new NotFoundError('Job');

  const body = parseBody(event);
  const input = CreateScoringConfigSchema.parse(body);

  const dataSource = await db();
  const jobRepo = new JobRepository(dataSource);
  const scoringRepo = new ScoringConfigRepository(dataSource);
  const auditRepo = dataSource.getRepository(AuditLog);

  const job = await jobRepo.findOne({ where: { id: jobId } });
  if (!job) throw new NotFoundError('Job');

  // Prevent overwriting an existing config
  const existing = await scoringRepo.findByJobId(jobId);
  if (existing) {
    throw new ConflictError(
      'This job already has a scoring configuration. Use PATCH /jobs/{jobId}/scoring to update it.'
    );
  }

  // Validate phase weights if dimensions are provided
  if (input.evaluationDimensions.length > 0) {
    const totalWeight = input.evaluationDimensions.reduce((s, d) => s + d.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new BusinessError(
        ErrorCode.WEIGHT_EXCEEDS_LIMIT,
        `Dimension weights must sum to 100%. Current total: ${totalWeight.toFixed(2)}%`
      );
    }
  }

  const configRepo = dataSource.getRepository(ScoringConfig);
  const dimRepo = dataSource.getRepository(EvaluationDimension);
  const ruleRepo = dataSource.getRepository(KnockoutRule);

  const scoringConfig = configRepo.create({
    jobId,
    totalScaleMax: input.totalScaleMax,
    preInterviewWeight: input.preInterviewWeight,
    postInterviewWeight: input.postInterviewWeight,
    shortlistThreshold: input.shortlistThreshold,
    passThreshold: input.passThreshold,
    manualReviewThreshold: input.manualReviewThreshold,
    isTemplate: input.isTemplate,
    templateName: input.templateName ?? null,
  });

  const savedConfig = await configRepo.save(scoringConfig);

  // Create evaluation dimensions
  const savedDimensions =
    input.evaluationDimensions.length > 0
      ? await dimRepo.save(
          input.evaluationDimensions.map((d) =>
            dimRepo.create({
              scoringConfigId: savedConfig.id,
              name: d.name,
              description: d.description ?? null,
              weight: d.weight,
              type: d.type,
              phase: d.phase,
              minimumThreshold: d.minimumThreshold ?? null,
              isVisibleToAllReviewers: d.isVisibleToAllReviewers,
              order: d.order,
            })
          )
        )
      : [];

  // Create knockout rules
  const savedRules =
    input.knockoutRules.length > 0
      ? await ruleRepo.save(
          input.knockoutRules.map((r) =>
            ruleRepo.create({
              scoringConfigId: savedConfig.id,
              name: r.name,
              description: r.description ?? null,
              condition: r.condition,
              conditionValue: r.conditionValue,
              action: r.action,
              errorMessage: r.errorMessage,
            })
          )
        )
      : [];

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.SCORING_CONFIG_CREATED,
      entityType: 'ScoringConfig',
      entityId: savedConfig.id,
      actorId: actor.id,
      newState: {
        jobId,
        totalScaleMax: savedConfig.totalScaleMax,
        dimensionCount: savedDimensions.length,
        knockoutRuleCount: savedRules.length,
      },
    })
  );

  return created({
    id: savedConfig.id,
    jobId: savedConfig.jobId,
    totalScaleMax: savedConfig.totalScaleMax,
    preInterviewWeight: savedConfig.preInterviewWeight,
    postInterviewWeight: savedConfig.postInterviewWeight,
    shortlistThreshold: savedConfig.shortlistThreshold,
    passThreshold: savedConfig.passThreshold,
    manualReviewThreshold: savedConfig.manualReviewThreshold,
    isTemplate: savedConfig.isTemplate,
    templateName: savedConfig.templateName,
    totalWeightUsed: savedDimensions.reduce((s, d) => s + Number(d.weight), 0),
    isWeightBalanced: savedDimensions.length === 0 || Math.abs(
      savedDimensions.reduce((s, d) => s + Number(d.weight), 0) - 100
    ) < 0.01,
    evaluationDimensions: savedDimensions,
    knockoutRules: savedRules,
    createdAt: savedConfig.createdAt,
    updatedAt: savedConfig.updatedAt,
  });
}

export const handler = withErrorHandler(handle);
