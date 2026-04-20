import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler';
import { ok } from '../../shared/response';
import { db } from '../../shared/db';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = { id: '595ee204-5f8f-4737-9e55-95cd8cda1b5b' }; // requireRoles(event, UserRole.HR_ADMIN);

  const dataSource = await db();
  const scoringRepo = new ScoringConfigRepository(dataSource);
  const templates = await scoringRepo.findTemplates();

  return ok(
    templates.map((t) => ({
      id: t.id,
      jobId: t.jobId,
      templateName: t.templateName,
      totalScaleMax: t.totalScaleMax,
      preInterviewWeight: Number(t.preInterviewWeight),
      postInterviewWeight: Number(t.postInterviewWeight),
      shortlistThreshold: Number(t.shortlistThreshold),
      dimensionCount: t.evaluationDimensions.length,
      knockoutRuleCount: t.knockoutRules.length,
      evaluationDimensions: t.evaluationDimensions.map((d) => ({
        name: d.name,
        weight: Number(d.weight),
        type: d.type,
        phase: d.phase,
      })),
      knockoutRules: t.knockoutRules.map((r) => ({
        name: r.name,
        condition: r.condition,
        action: r.action,
      })),
    }))
  );
}

export const handler = withErrorHandler(handle);
