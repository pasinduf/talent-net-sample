import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { ApplicationForm, ScreeningQuestion } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler';
import { ok } from '../../shared/response';
import { NotFoundError } from '../../shared/errors';
import { db } from '../../shared/db';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const jobId = event.pathParameters?.jobId;
  const questionId = event.pathParameters?.questionId;
  if (!jobId) throw new NotFoundError('Job');
  if (!questionId) throw new NotFoundError('ScreeningQuestion');

  const dataSource = await db();
  const formRepo = dataSource.getRepository(ApplicationForm);
  const questionRepo = dataSource.getRepository(ScreeningQuestion);

  const form = await formRepo.findOne({ where: { jobId } });
  if (!form) throw new NotFoundError('ApplicationForm');

  const question = await questionRepo.findOne({
    where: { id: questionId, applicationFormId: form.id },
  });
  if (!question) throw new NotFoundError('ScreeningQuestion');

  await questionRepo.remove(question);

  return ok({ deleted: true });
}

export const handler = withErrorHandler(handle);
