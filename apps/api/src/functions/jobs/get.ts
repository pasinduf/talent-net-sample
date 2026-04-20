import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { UserRole } from '@talent-net/types';
import { JobRepository } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler';
import { requireRoles } from '../../middleware/auth';
import { ok } from '../../shared/response';
import { NotFoundError } from '../../shared/errors';
import { db } from '../../shared/db';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  // requireRoles(
  //   event,
  //   UserRole.HR_ADMIN,
  //   UserRole.HIRING_MANAGER,
  //   UserRole.SYSTEM_SUPERVISOR,
  //   UserRole.INTERVIEWER
  // );

  const id = event.pathParameters?.id;
  if (!id) throw new NotFoundError('Job');

  const dataSource = await db();
  const jobRepo = new JobRepository(dataSource);
  const job = await jobRepo.findWithFullDetail(id);
  if (!job) throw new NotFoundError('Job');

  return ok({
    id: job.id,
    title: job.title,
    slug: job.slug,
    description: job.description,
    department: job.department,
    level: job.level,
    employmentType: job.employmentType,
    location: job.location,
    isRemote: job.isRemote,
    status: job.status,
    interviewTypes: job.interviewTypes,
    headcount: job.headcount,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    applicationDeadline: job.applicationDeadline,
    publishedAt: job.publishedAt,
    closedAt: job.closedAt,
    createdBy: {
      id: job.createdBy.id,
      fullName: job.createdBy.fullName,
    },
    hasScoringConfig: job.scoringConfig !== null,
    scoringConfig: job.scoringConfig
      ? {
          id: job.scoringConfig.id,
          totalScaleMax: job.scoringConfig.totalScaleMax,
          totalWeightUsed: job.scoringConfig.totalWeightUsed,
          isWeightBalanced: job.scoringConfig.isWeightBalanced,
          shortlistThreshold: job.scoringConfig.shortlistThreshold,
          passThreshold: job.scoringConfig.passThreshold,
          dimensionCount: job.scoringConfig.evaluationDimensions?.length ?? 0,
          knockoutRuleCount: job.scoringConfig.knockoutRules?.length ?? 0,
        }
      : null,
    applicationForm: job.applicationForm
      ? {
          requireResume: job.applicationForm.requireResume,
          screeningQuestions: job.applicationForm.screeningQuestions,
        }
      : null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}

export const handler = withErrorHandler(handle);
