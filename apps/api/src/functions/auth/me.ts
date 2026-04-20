import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { User } from '@talent-net/database';
import { withErrorHandler } from '../../middleware/handler';
import { requireAuth } from '../../middleware/auth';
import { ok } from '../../shared/response';
import { NotFoundError } from '../../shared/errors';
import { db } from '../../shared/db';

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const authUser = requireAuth(event);

  const dataSource = await db();
  const userRepo = dataSource.getRepository(User);

  const user = await userRepo.findOne({ where: { id: authUser.id } });
  if (!user) throw new NotFoundError('User');

  return ok({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  });
}

export const handler = withErrorHandler(handle);
