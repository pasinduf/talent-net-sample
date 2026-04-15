import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { UserRole } from '@talent-net/types';
import { ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler.js';
import { requireRoles } from '../../middleware/auth.js';
import { ok } from '../../shared/response.js';
import { NotFoundError } from '../../shared/errors.js';
import { db } from '../../shared/db.js';

/**
 * Validates the scoring configuration for a job and returns a detailed
 * readiness report.  Used by the UI before allowing a job to be published.
 */
async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  requireRoles(event, UserRole.HR_ADMIN, UserRole.SYSTEM_SUPERVISOR);

  const jobId = event.pathParameters?.jobId;
  if (!jobId) throw new NotFoundError('Job');

  const dataSource = await db();
  const scoringRepo = new ScoringConfigRepository(dataSource);

  const config = await scoringRepo.findByJobId(jobId);
  if (!config) {
    return ok({
      isValid: false,
      isReadyToPublish: false,
      errors: ['No scoring configuration found. Create one before publishing.'],
      warnings: [],
      summary: {
        totalWeightUsed: 0,
        dimensionCount: 0,
        knockoutRuleCount: 0,
      },
    });
  }

  const { isValid, totalWeight, errors } = await scoringRepo.validateWeights(config.id);
  const warnings: string[] = [];

  if (config.knockoutRules.length === 0) {
    warnings.push('No knockout rules defined. Consider adding mandatory criteria.');
  }

  if (config.evaluationDimensions.length < 2) {
    warnings.push('Only one evaluation dimension defined. A richer rubric yields better ranking.');
  }

  const prePhaseWeight = config.evaluationDimensions
    .filter((d) => d.phase === 'pre_interview')
    .reduce((s, d) => s + Number(d.weight), 0);

  const postPhaseWeight = config.evaluationDimensions
    .filter((d) => d.phase === 'post_interview')
    .reduce((s, d) => s + Number(d.weight), 0);

  if (prePhaseWeight > 0 && postPhaseWeight === 0 && Number(config.postInterviewWeight) > 0) {
    warnings.push(
      'Post-interview weight is configured but no post-interview dimensions exist.'
    );
  }

  return ok({
    isValid,
    isReadyToPublish: isValid && errors.length === 0,
    errors,
    warnings,
    summary: {
      totalWeightUsed: totalWeight,
      isWeightBalanced: config.isWeightBalanced,
      dimensionCount: config.evaluationDimensions.length,
      knockoutRuleCount: config.knockoutRules.length,
      shortlistThreshold: Number(config.shortlistThreshold),
      passThreshold: Number(config.passThreshold),
      manualReviewThreshold: Number(config.manualReviewThreshold),
      preInterviewWeight: Number(config.preInterviewWeight),
      postInterviewWeight: Number(config.postInterviewWeight),
    },
  });
}

export const handler = withErrorHandler(handle);
