import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { JobStatus, ApplicationStatus, InterviewStatus } from '@talent-net/types';
import { withErrorHandler } from '../../middleware/handler';
import { ok } from '../../shared/response';
import { db } from '../../shared/db';

async function handle(
  _event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const dataSource = await db();

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const [openRoles, activeApplications, interviewsThisWeek, offersExtended] = await Promise.all([
    dataSource
      .getRepository('Job')
      .createQueryBuilder('j')
      .where('j.status = :status', { status: JobStatus.PUBLISHED })
      .getCount(),

    dataSource
      .getRepository('Application')
      .createQueryBuilder('a')
      .where('a.status NOT IN (:...statuses)', {
        statuses: [
          ApplicationStatus.REJECTED,
          ApplicationStatus.WITHDRAWN,
          ApplicationStatus.CLOSED,
        ],
      })
      .getCount(),

    dataSource
      .getRepository('Interview')
      .createQueryBuilder('i')
      .where('i.status IN (:...statuses)', {
        statuses: [InterviewStatus.SCHEDULED, InterviewStatus.IN_PROGRESS],
      })
      .andWhere('i.createdAt >= :weekStart', { weekStart })
      .andWhere('i.createdAt < :weekEnd', { weekEnd })
      .getCount(),

    dataSource
      .getRepository('Application')
      .createQueryBuilder('a')
      .where('a.status = :status', { status: ApplicationStatus.OFFER_STAGE })
      .getCount(),
  ]);

  return ok({ openRoles, activeApplications, interviewsThisWeek, offersExtended });
}

export const handler = withErrorHandler(handle);
