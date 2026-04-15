import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { withErrorHandler, parseBody } from '../../middleware/handler.js';
import { created } from '../../shared/response.js';

const RegisterSchema = z.object({
  password: z.string().min(6, 'Password must be at least 8 characters'),
});

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {

  const body = parseBody(event);
  const input = RegisterSchema.parse(body);

  const passwordHash = await bcrypt.hash(input.password, 12);

  return created({
    password: passwordHash,
  });
}

export const handler = withErrorHandler(handle);
