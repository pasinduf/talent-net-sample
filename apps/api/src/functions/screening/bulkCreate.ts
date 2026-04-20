import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import { QuestionType, UserRole } from '@talent-net/types';
import { ApplicationForm, ScreeningQuestion, JobRepository } from '@talent-net/database';
import { withErrorHandler, parseBody } from '../../middleware/handler';
import { created } from '../../shared/response';
import { NotFoundError } from '../../shared/errors';
import { db } from '../../shared/db';
import { requireRoles } from '../../middleware/auth';

const ScreeningQuestionSchema = z.object({
  question: z.string().min(1).max(1000),
  type: z.nativeEnum(QuestionType),
  isRequired: z.boolean().default(false),
  isKnockout: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  knockoutAnswers: z.array(z.string()).optional(),
  helpText: z.string().max(500).optional(),
  order: z.number().int().min(0).default(0),
});

const BulkCreateScreeningSchema = z.object({
  questions: z.array(ScreeningQuestionSchema).min(1),
});

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {

  //requireRoles(event, UserRole.HR_ADMIN);
  
  const jobId = event.pathParameters?.jobId;
  if (!jobId) throw new NotFoundError('Job');

  const body = parseBody(event);
  const input = BulkCreateScreeningSchema.parse(body);

  const dataSource = await db();
  const jobRepo = new JobRepository(dataSource);
  const formRepo = dataSource.getRepository(ApplicationForm);
  const questionRepo = dataSource.getRepository(ScreeningQuestion);

  const job = await jobRepo.findOne({ where: { id: jobId } });
  if (!job) throw new NotFoundError('Job');

  const form = await formRepo.findOne({ where: { jobId } });
  if (!form) throw new NotFoundError('ApplicationForm');

  const saved = await questionRepo.save(
    input.questions.map((q) =>
      questionRepo.create({
        applicationFormId: form.id,
        question: q.question,
        type: q.type,
        isRequired: q.isRequired,
        isKnockout: q.isKnockout,
        options: q.options ?? null,
        knockoutAnswers: q.knockoutAnswers ?? null,
        helpText: q.helpText ?? null,
        order: q.order,
      })
    )
  );

  return created({
    count: saved.length,
    questions: saved.map((sq) => ({
      id: sq.id,
      question: sq.question,
      type: sq.type,
      isRequired: sq.isRequired,
      isKnockout: sq.isKnockout,
      order: sq.order,
    })),
  });
}

export const handler = withErrorHandler(handle);
