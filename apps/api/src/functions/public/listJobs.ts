import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { JobStatus, EmploymentType, ExperienceLevel } from '@talent-net/types';
import { JobRepository } from '@talent-net/database';
import { withErrorHandler, parsePagination } from '../../middleware/handler.js';
import { ok } from '../../shared/response.js';
import { db } from '../../shared/db.js';

/**
 * Public endpoint — no authentication required.
 * Returns only PUBLISHED jobs for the careers portal.
 */
async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const qs = event.queryStringParameters ?? {};
  const { page, limit } = parsePagination(event);

  const dataSource = await db();
  const jobRepo = new JobRepository(dataSource);

  const [jobs, total] = await jobRepo.findPublishedForPortal({
    department: qs.department,
    level: qs.level as ExperienceLevel | undefined,
    employmentType: qs.employmentType as EmploymentType | undefined,
    isRemote: qs.isRemote !== undefined ? qs.isRemote === 'true' : undefined,
    search: qs.search,
    page,
    limit,
  });

  const totalPages = Math.ceil(total / limit);

  return ok(
    jobs.map((j) => ({
      id: j.id,
      title: j.title,
      slug: j.slug,
      department: j.department,
      level: j.level,
      employmentType: j.employmentType,
      location: j.location,
      isRemote: j.isRemote,
      status: j.status,
      applicationDeadline: j.applicationDeadline,
      publishedAt: j.publishedAt,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      salaryCurrency: j.salaryCurrency,
    })),
    {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }
  );
}

export const handler = withErrorHandler(handle);
