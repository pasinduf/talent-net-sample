import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import { EmploymentType, ExperienceLevel, InterviewType, UserRole, JobStatus, AuditAction, ErrorCode } from '@talent-net/types';
import { AuditLog, JobRepository } from '@talent-net/database';
import { withErrorHandler, parseBody } from '../../middleware/handler.js';
import { requireRoles } from '../../middleware/auth.js';
import { ok } from '../../shared/response.js';
import { NotFoundError, BusinessError } from '../../shared/errors.js';
import { db } from '../../shared/db.js';

const UpdateJobSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(10).optional(),
  department: z.string().min(1).max(100).optional(),
  employmentType: z.nativeEnum(EmploymentType).optional(),
  level: z.nativeEnum(ExperienceLevel).optional(),
  location: z.string().min(1).max(255).optional(),
  isRemote: z.boolean().optional(),
  applicationDeadline: z.string().datetime().nullable().optional(),
  interviewTypes: z.array(z.nativeEnum(InterviewType)).min(1).optional(),
  headcount: z.number().int().positive().nullable().optional(),
  salaryMin: z.number().positive().nullable().optional(),
  salaryMax: z.number().positive().nullable().optional(),
  salaryCurrency: z.string().length(3).optional(),
});

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = { id: '595ee204-5f8f-4737-9e55-95cd8cda1b5b' }; // requireRoles(event, UserRole.HR_ADMIN);

  const id = event.pathParameters?.id;
  if (!id) throw new NotFoundError('Job');

  const dataSource = await db();
  const jobRepo = new JobRepository(dataSource);
  const auditRepo = dataSource.getRepository(AuditLog);

  const job = await jobRepo.findOne({ where: { id } });
  if (!job) throw new NotFoundError('Job');

  if (job.status === JobStatus.ARCHIVED || job.status === JobStatus.CLOSED) {
    throw new BusinessError(
      ErrorCode.INVALID_STATUS_TRANSITION,
      `Cannot edit a job in '${job.status}' status`
    );
  }

  const body = parseBody(event);
  const input = UpdateJobSchema.parse(body);

  const previousState = { title: job.title, status: job.status };

  if (input.title !== undefined) job.title = input.title;
  if (input.description !== undefined) job.description = input.description;
  if (input.department !== undefined) job.department = input.department;
  if (input.employmentType !== undefined) job.employmentType = input.employmentType;
  if (input.level !== undefined) job.level = input.level;
  if (input.location !== undefined) job.location = input.location;
  if (input.isRemote !== undefined) job.isRemote = input.isRemote;
  if (input.interviewTypes !== undefined) job.interviewTypes = input.interviewTypes;
  if (input.headcount !== undefined) job.headcount = input.headcount;
  if (input.salaryMin !== undefined) job.salaryMin = input.salaryMin;
  if (input.salaryMax !== undefined) job.salaryMax = input.salaryMax;
  if (input.salaryCurrency !== undefined) job.salaryCurrency = input.salaryCurrency;
  if (input.applicationDeadline !== undefined) {
    job.applicationDeadline = input.applicationDeadline ? new Date(input.applicationDeadline) : null;
  }

  const saved = await jobRepo.save(job);

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.JOB_UPDATED,
      entityType: 'Job',
      entityId: saved.id,
      actorId: actor.id,
      previousState,
      newState: { title: saved.title, updatedAt: saved.updatedAt },
    })
  );

  return ok({
    id: saved.id,
    title: saved.title,
    slug: saved.slug,
    status: saved.status,
    updatedAt: saved.updatedAt,
  });
}

export const handler = withErrorHandler(handle);
