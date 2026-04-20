import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '@talent-net/database';
import { JwtPayload } from '@talent-net/types';
import { withErrorHandler, parseBody } from '../../middleware/handler';
import { ok } from '../../shared/response';
import { UnauthorizedError } from '../../shared/errors';
import { db } from '../../shared/db';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const body = parseBody(event);
  const input = LoginSchema.parse(body);

  const dataSource = await db();
  const userRepo = dataSource.getRepository(User);

  // passwordHash has select:false — add it back explicitly
  const user = await userRepo
    .createQueryBuilder('user')
    .addSelect('user.passwordHash')
    .where('user.email = :email', { email: input.email.toLowerCase() })
    .getOne();

  if (!user) throw new UnauthorizedError('Invalid email or password');
  if (!user.isActive) throw new UnauthorizedError('Account is disabled');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  user.lastLoginAt = new Date();
  await userRepo.save(user);

  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';

  const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

  return ok({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    },
  });
}

export const handler = withErrorHandler(handle);
