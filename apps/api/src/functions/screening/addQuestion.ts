import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import { QuestionType } from '@talent-net/types';
import { ApplicationForm, ScreeningQuestion } from '@talent-net/database';
import { withErrorHandler, parseBody } from '../../middleware/handler';
import { created } from '../../shared/response';
import { NotFoundError } from '../../shared/errors';
import { db } from '../../shared/db';

const AddQuestionSchema = z.object({
  question: z.string().min(1).max(1000),
  type: z.nativeEnum(QuestionType),
  isRequired: z.boolean().default(false),
  isKnockout: z.boolean().default(false),
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
  if (!jobId) throw new NotFoundError('Job');

  const dataSource = await db();
  const formRepo = dataSource.getRepository(ApplicationForm);
  const questionRepo = dataSource.getRepository(ScreeningQuestion);

  const form = await formRepo.findOne({
    where: { jobId },
    relations: ['screeningQuestions'],
  });
  if (!form) throw new NotFoundError('ApplicationForm');

  const body = parseBody(event);
  const input = AddQuestionSchema.parse(body);

  const nextOrder = input.order ?? form.screeningQuestions.length;

  const saved = await questionRepo.save(
    questionRepo.create({
      applicationFormId: form.id,
      question: input.question,
      type: input.type,
      isRequired: input.isRequired,
      isKnockout: input.isKnockout,
      options: input.options ?? null,
      knockoutAnswers: input.knockoutAnswers ?? null,
      helpText: input.helpText ?? null,
      order: nextOrder,
    })
  );

  return created({
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
