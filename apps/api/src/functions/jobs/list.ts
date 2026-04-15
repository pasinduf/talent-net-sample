import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { JobStatus, EmploymentType, ExperienceLevel, UserRole } from '@talent-net/types';
import { JobRepository } from '@talent-net/database';
import { withErrorHandler, parsePagination } from '../../middleware/handler.js';
import { requireRoles } from '../../middleware/auth.js';
import { ok } from '../../shared/response.js';
import { db } from '../../shared/db.js';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  // requireRoles(
  //   event,
  //   UserRole.HR_ADMIN,
  //   UserRole.HIRING_MANAGER,
  //   UserRole.SYSTEM_SUPERVISOR
  // );

  const qs = event.queryStringParameters ?? {};
  const { page, limit } = parsePagination(event);

  const dataSource = await db();
  const jobRepo = new JobRepository(dataSource);

  const [jobs, total] = await jobRepo.findWithFilters({
    status: qs.status as JobStatus | undefined,
    department: qs.department,
    level: qs.level as ExperienceLevel | undefined,
    employmentType: qs.employmentType as EmploymentType | undefined,
    isRemote: qs.isRemote !== undefined ? qs.isRemote === 'true' : undefined,
    search: qs.search,
    page,
    limit,
    sortBy: qs.sortBy ?? 'createdAt',
    sortOrder: (qs.sortOrder as 'ASC' | 'DESC') ?? 'DESC',
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
      hasScoringConfig: j.scoringConfig !== null,
      createdAt: j.createdAt,
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
