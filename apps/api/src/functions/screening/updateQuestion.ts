import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import { QuestionType } from '@talent-net/types';
import { ApplicationForm, ScreeningQuestion } from '@talent-net/database';
import { withErrorHandler, parseBody } from '../../middleware/handler.js';
import { ok } from '../../shared/response.js';
import { NotFoundError } from '../../shared/errors.js';
import { db } from '../../shared/db.js';

const UpdateQuestionSchema = z.object({
  question: z.string().min(1).max(1000).optional(),
  type: z.nativeEnum(QuestionType).optional(),
  isRequired: z.boolean().optional(),
  isKnockout: z.boolean().optional(),
  options: z.array(z.string()).nullable().optional(),
  knockoutAnswers: z.array(z.string()).nullable().optional(),
  helpText: z.string().max(500).nullable().optional(),
  order: z.number().int().min(0).optional(),
});

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

  const body = parseBody(event);
  const input = UpdateQuestionSchema.parse(body);

  if (input.question !== undefined) question.question = input.question;
  if (input.type !== undefined) question.type = input.type;
  if (input.isRequired !== undefined) question.isRequired = input.isRequired;
  if (input.isKnockout !== undefined) question.isKnockout = input.isKnockout;
  if (input.options !== undefined) question.options = input.options ?? null;
  if (input.knockoutAnswers !== undefined) question.knockoutAnswers = input.knockoutAnswers ?? null;
  if (input.helpText !== undefined) question.helpText = input.helpText ?? null;
  if (input.order !== undefined) question.order = input.order;

  const saved = await questionRepo.save(question);

  return ok({
    id: saved.id,
    applicationFormId: saved.applicationFormId,
    question: saved.question,
    type: saved.type,
    isRequired: saved.isRequired,
    isKnockout: saved.isKnockout,
    options: saved.options,
    knockoutAnswers: saved.knockoutAnswers,
    helpText: saved.helpText,
    order: saved.order,
  });
}

export const handler = withErrorHandler(handle);
