import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import { EmploymentType, ExperienceLevel, InterviewType, UserRole, AuditAction } from '@talent-net/types';
import { Job, ApplicationForm, AuditLog, JobRepository } from '@talent-net/database';
import { withErrorHandler, parseBody } from '../../middleware/handler.js';
import { requireRoles } from '../../middleware/auth.js';
import { created } from '../../shared/response.js';
import { db } from '../../shared/db.js';

const CreateJobSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(10),
  department: z.string().min(1).max(100),
  employmentType: z.nativeEnum(EmploymentType),
  level: z.nativeEnum(ExperienceLevel),
  location: z.string().min(1).max(255),
  isRemote: z.boolean().default(false),
  applicationDeadline: z.string().optional(),
  interviewTypes: z.array(z.nativeEnum(InterviewType)).min(1),
  headcount: z.number().int().positive().optional(),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
  salaryCurrency: z.string().length(3).default('LKR'),
});

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = { id: '595ee204-5f8f-4737-9e55-95cd8cda1b5b' }; //requireRoles(event, UserRole.HR_ADMIN);
  const body = parseBody(event);
  const input = CreateJobSchema.parse(body);

  const dataSource = await db();
  const jobRepo = new JobRepository(dataSource);
  const auditRepo = dataSource.getRepository(AuditLog);

  const slug = await jobRepo.generateUniqueSlug(input.title);

  const job = jobRepo.create({
    title: input.title,
    slug,
    description: input.description,
    department: input.department,
    employmentType: input.employmentType,
    level: input.level,
    location: input.location,
    isRemote: input.isRemote,
    interviewTypes: input.interviewTypes,
    headcount: input.headcount ?? null,
    salaryMin: input.salaryMin ?? null,
    salaryMax: input.salaryMax ?? null,
    salaryCurrency: input.salaryCurrency,
    applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null,
    createdById: actor.id,
  });

  const saved = await jobRepo.save(job);

  // Auto-create a blank ApplicationForm so HR can configure questions immediately.
  const formRepo = dataSource.getRepository(ApplicationForm);
  await formRepo.save(formRepo.create({ jobId: saved.id, requireResume: true }));

  // Audit trail
  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.JOB_CREATED,
      entityType: 'Job',
      entityId: saved.id,
      actorId: actor.id,
      newState: { id: saved.id, title: saved.title, status: saved.status },
    })
  );

  return created({ id: saved.id, slug: saved.slug, status: saved.status, title: saved.title });
}

export const handler = withErrorHandler(handle);
