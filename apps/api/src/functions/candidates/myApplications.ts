import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { Application } from '@talent-net/database';
import { UserRole } from '@talent-net/types';
import { withErrorHandler } from '../../middleware/handler';
import { ok } from '../../shared/response';
import { requireRoles } from '../../middleware/auth';
import { db } from '../../shared/db';

/** GET /candidates/me/applications — lists all applications for the authenticated candidate. */
async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = requireRoles(event, UserRole.APPLICANT);

  const dataSource = await db();
  const applicationRepo = dataSource.getRepository(Application);

  const applications = await applicationRepo.find({
    where: { candidateId: actor.id },
    relations: ['job'],
    order: { submittedAt: 'DESC' },
  });

  return ok(
    applications.map((app) => ({
      id: app.id,
      status: app.status,
      submittedAt: app.submittedAt,
      job: app.job
        ? {
            id: app.job.id,
            title: app.job.title,
            slug: app.job.slug,
            department: app.job.department,
            location: app.job.location,
            status: app.job.status,
          }
        : null,
    }))
  );
}

export const handler = withErrorHandler(handle);
