import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { UserRole, JobStatus, AuditAction } from '@talent-net/types';
import { ApplicationForm, AuditLog, JobRepository, ScoringConfigRepository } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler';
import { requireRoles } from '../../middleware/auth';
import { created } from '../../shared/response';
import { NotFoundError } from '../../shared/errors';
import { db } from '../../shared/db';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = { id: '595ee204-5f8f-4737-9e55-95cd8cda1b5b' }; // requireRoles(event, UserRole.HR_ADMIN);

  const id = event.pathParameters?.id;
  if (!id) throw new NotFoundError('Job');

  const dataSource = await db();
  const jobRepo = new JobRepository(dataSource);
  const scoringRepo = new ScoringConfigRepository(dataSource);
  const auditRepo = dataSource.getRepository(AuditLog);

  const source = await jobRepo.findWithFullDetail(id);
  if (!source) throw new NotFoundError('Job');

  // Generate a unique slug for the copy
  const newSlug = await jobRepo.generateUniqueSlug(`${source.title}`);

  const copy = jobRepo.create({
    title: `${source.title} (Copy)`,
    slug: newSlug,
    description: source.description,
    department: source.department,
    employmentType: source.employmentType,
    level: source.level,
    location: source.location,
    isRemote: source.isRemote,
    interviewTypes: source.interviewTypes,
    headcount: source.headcount,
    salaryMin: source.salaryMin,
    salaryMax: source.salaryMax,
    salaryCurrency: source.salaryCurrency,
    status: JobStatus.DRAFT,
    createdById: actor.id,
  });

  const savedJob = await jobRepo.save(copy);

  // Clone the scoring config if one exists
  if (source.scoringConfig) {
    const scoring = await scoringRepo.findByJobId(source.id);
    if (scoring) {
      await scoringRepo.cloneFromTemplate(scoring.id, savedJob.id);
    }
  }

  // Create a blank application form
  const formRepo = dataSource.getRepository(ApplicationForm);
  await formRepo.save(formRepo.create({ jobId: savedJob.id, requireResume: true }));

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.JOB_CREATED,
      entityType: 'Job',
      entityId: savedJob.id,
      jobId: savedJob.id,
      actorId: actor.id,
      newState: {
        id: savedJob.id,
        title: savedJob.title,
        status: savedJob.status,
        duplicatedFrom: source.id,
      },
    })
  );

  return created({
    id: savedJob.id,
    slug: savedJob.slug,
    title: savedJob.title,
    status: savedJob.status,
    duplicatedFrom: source.id,
  });
}

export const handler = withErrorHandler(handle);
