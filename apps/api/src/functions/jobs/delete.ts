import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { UserRole, JobStatus, AuditAction, ErrorCode } from '@talent-net/types';
import { AuditLog, JobRepository } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler';
import { requireRoles } from '../../middleware/auth';
import { noContent } from '../../shared/response';
import { NotFoundError, BusinessError } from '../../shared/errors';
import { db } from '../../shared/db';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = requireRoles(event, UserRole.HR_ADMIN);

  const id = event.pathParameters?.id;
  if (!id) throw new NotFoundError('Job');

  const dataSource = await db();
  const jobRepo = new JobRepository(dataSource);
  const auditRepo = dataSource.getRepository(AuditLog);

  const job = await jobRepo.findOne({ where: { id } });
  if (!job) throw new NotFoundError('Job');

  // Only draft jobs can be permanently deleted; published/closed jobs must be archived
  if (job.status !== JobStatus.DRAFT) {
    throw new BusinessError(
      ErrorCode.INVALID_STATUS_TRANSITION,
      `Only draft jobs can be deleted. Current status: '${job.status}'. Use the archive endpoint instead.`
    );
  }

  await auditRepo.save(
    auditRepo.create({
      action: AuditAction.JOB_DELETED,
      entityType: 'Job',
      entityId: job.id,
      jobId: id,
      actorId: actor.id,
      previousState: { status: job.status, title: job.title },
      newState: { deleted: true },
    })
  );

  await jobRepo.remove(job);

  return noContent();
}

export const handler = withErrorHandler(handle);
