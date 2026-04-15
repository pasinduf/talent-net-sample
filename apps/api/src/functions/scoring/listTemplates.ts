import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { UserRole } from '@talent-net/types';
import { ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler.js';
import { requireRoles } from '../../middleware/auth.js';
import { ok } from '../../shared/response.js';
import { db } from '../../shared/db.js';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  requireRoles(event, UserRole.HR_ADMIN);

  const dataSource = await db();
  const scoringRepo = new ScoringConfigRepository(dataSource);
  const templates = await scoringRepo.findTemplates();

  return ok(
    templates.map((t) => ({
      id: t.id,
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
