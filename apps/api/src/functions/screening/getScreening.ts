import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { ApplicationForm } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler.js';
import { ok } from '../../shared/response.js';
import { NotFoundError } from '../../shared/errors.js';
import { db } from '../../shared/db.js';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const jobId = event.pathParameters?.jobId;
  if (!jobId) throw new NotFoundError('Job');

  const dataSource = await db();
  const formRepo = dataSource.getRepository(ApplicationForm);

  const form = await formRepo.findOne({
    where: { jobId },
    relations: ['screeningQuestions'],
    order: { screeningQuestions: { order: 'ASC' } } as any,
  });
  if (!form) throw new NotFoundError('ApplicationForm');

  return ok({
    id: form.id,
    requireResume: form.requireResume,
    requireCoverLetter: form.requireCoverLetter,
    questions: form.screeningQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      isRequired: q.isRequired,
      isKnockout: q.isKnockout,
      options: q.options,
      knockoutAnswers: q.knockoutAnswers,
      helpText: q.helpText,
      order: q.order,
    })),
  });
}

export const handler = withErrorHandler(handle);
