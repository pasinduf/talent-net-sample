import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { UserRole, JobStatus, AuditAction, ErrorCode } from '@talent-net/types';
import { AuditLog, JobRepository } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler';
import { requireRoles } from '../../middleware/auth';
import { ok } from '../../shared/response';
import { NotFoundError, BusinessError } from '../../shared/errors';
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
  const auditRepo = dataSource.getRepository(AuditLog);

  const job = await jobRepo.findOne({ where: { id } });
  if (!job) throw new NotFoundError('Job');

  if (job.status !== JobStatus.PAUSED) {
    throw new BusinessError(
      ErrorCode.INVALID_STATUS_TRANSITION,
      `Only paused jobs can be reopened. Current status: '${job.status}'`
    );
  }

  job.status = JobStatus.PUBLISHED;
  const saved = await jobRepo.save(job);

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.JOB_PUBLISHED,
      entityType: 'Job',
      entityId: saved.id,
      jobId: id,
      actorId: actor.id,
      previousState: { status: JobStatus.PAUSED },
      newState: { status: JobStatus.PUBLISHED },
    })
  );

  return ok({ id: saved.id, status: saved.status });
}

export const handler = withErrorHandler(handle);
