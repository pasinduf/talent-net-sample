import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import { UserRole, AuditAction } from '@talent-net/types';
import { AuditLog, ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler, parseBody } from '../../middleware/handler.js';
import { requireRoles } from '../../middleware/auth.js';
import { ok } from '../../shared/response.js';
import { NotFoundError } from '../../shared/errors.js';
import { db } from '../../shared/db.js';

const UpdateScoringConfigSchema = z
  .object({
    totalScaleMax: z.number().min(1).max(1000).optional(),
    preInterviewWeight: z.number().min(0).max(100).optional(),
    postInterviewWeight: z.number().min(0).max(100).optional(),
    shortlistThreshold: z.number().min(0).optional(),
    passThreshold: z.number().min(0).optional(),
    manualReviewThreshold: z.number().min(0).optional(),
    isTemplate: z.boolean().optional(),
    templateName: z.string().max(200).nullable().optional(),
  })
  .refine(
    (d) => {
      if (d.preInterviewWeight !== undefined && d.postInterviewWeight !== undefined) {
        return Math.abs(d.preInterviewWeight + d.postInterviewWeight - 100) < 0.01;
      }
      return true;
    },
    { message: 'preInterviewWeight + postInterviewWeight must equal 100' }
  );

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

  const body = parseBody(event);
  const input = UpdateScoringConfigSchema.parse(body);
  const previousState = {
    totalScaleMax: config.totalScaleMax,
    preInterviewWeight: config.preInterviewWeight,
    postInterviewWeight: config.postInterviewWeight,
  };

  if (input.totalScaleMax !== undefined) config.totalScaleMax = input.totalScaleMax;
  if (input.preInterviewWeight !== undefined) config.preInterviewWeight = input.preInterviewWeight;
  if (input.postInterviewWeight !== undefined) config.postInterviewWeight = input.postInterviewWeight;
  if (input.shortlistThreshold !== undefined) config.shortlistThreshold = input.shortlistThreshold;
  if (input.passThreshold !== undefined) config.passThreshold = input.passThreshold;
  if (input.manualReviewThreshold !== undefined) config.manualReviewThreshold = input.manualReviewThreshold;
  if (input.isTemplate !== undefined) config.isTemplate = input.isTemplate;
  if (input.templateName !== undefined) config.templateName = input.templateName;

  const saved = await scoringRepo.save(config);

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.SCORING_CONFIG_UPDATED,
      entityType: 'ScoringConfig',
      entityId: saved.id,
      actorId: actor.id,
      previousState,
      newState: {
        totalScaleMax: saved.totalScaleMax,
        preInterviewWeight: saved.preInterviewWeight,
        postInterviewWeight: saved.postInterviewWeight,
      },
    })
  );

  return ok({
    id: saved.id,
    jobId,
    totalScaleMax: saved.totalScaleMax,
    preInterviewWeight: Number(saved.preInterviewWeight),
    postInterviewWeight: Number(saved.postInterviewWeight),
    shortlistThreshold: Number(saved.shortlistThreshold),
    passThreshold: Number(saved.passThreshold),
    manualReviewThreshold: Number(saved.manualReviewThreshold),
    isTemplate: saved.isTemplate,
    templateName: saved.templateName,
    updatedAt: saved.updatedAt,
  });
}

export const handler = withErrorHandler(handle);
