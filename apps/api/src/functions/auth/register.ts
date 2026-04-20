import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { User } from '@talent-net/database';
import { UserRole, ErrorCode } from '@talent-net/types';
import { parseBody, withErrorHandler,  } from '../../middleware/handler';
import { requireRoles } from '../../middleware/auth';
import { created } from '../../shared/response';
import { ConflictError } from '../../shared/errors';
import { db } from '../../shared/db';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.nativeEnum(UserRole).default(UserRole.HR_ADMIN),
});

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  // Only system supervisors can create new internal users
  requireRoles(event, UserRole.SYSTEM_SUPERVISOR, UserRole.HR_ADMIN);

  const body = parseBody(event);
  const input = RegisterSchema.parse(body);

  const dataSource = await db();
  const userRepo = dataSource.getRepository(User);

  const existing = await userRepo.findOne({
    where: { email: input.email.toLowerCase() },
  });
  if (existing) {
    throw new ConflictError('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = userRepo.create({
    email: input.email.toLowerCase(),
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role,
    isActive: true,
  });

  const saved = await userRepo.save(user);

  return created({
    id: saved.id,
    email: saved.email,
    firstName: saved.firstName,
    lastName: saved.lastName,
    role: saved.role,
    createdAt: saved.createdAt,
  });
}

export const handler = withErrorHandler(handle);
