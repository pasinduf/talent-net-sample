import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { JobStatus } from '@talent-net/types';
import { JobRepository } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler';
import { ok } from '../../shared/response';
import { NotFoundError } from '../../shared/errors';
import { db } from '../../shared/db';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const slug = event.pathParameters?.slug;
  if (!slug) throw new NotFoundError('Job');

  const dataSource = await db();
  const jobRepo = new JobRepository(dataSource);

  const job = await jobRepo.findBySlug(slug);
  if (!job || job.status !== JobStatus.PUBLISHED) throw new NotFoundError('Job');

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
    applicationDeadline: job.applicationDeadline,
    publishedAt: job.publishedAt,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    applicationForm: job.applicationForm
      ? {
          requireResume: job.applicationForm.requireResume,
          requireCoverLetter: job.applicationForm.requireCoverLetter,
          allowIntroductoryMedia: job.applicationForm.allowIntroductoryMedia,
          requirePortfolioUrl: job.applicationForm.requirePortfolioUrl,
          requireLinkedInUrl: job.applicationForm.requireLinkedInUrl,
          additionalInstructions: job.applicationForm.additionalInstructions,
          screeningQuestions: (job.applicationForm.screeningQuestions ?? []).map((q) => ({
            id: q.id,
            question: q.question,
            type: q.type,
            isRequired: q.isRequired,
            options: q.options,
            helpText: q.helpText,
            order: q.order,
          })),
        }
      : null,
  });
}

export const handler = withErrorHandler(handle);
