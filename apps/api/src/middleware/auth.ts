import { APIGatewayProxyEventV2 } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { AuthenticatedUser, JwtPayload, UserRole } from '@talent-net/types';
import { UnauthorizedError } from '../shared/errors';

export function extractBearerToken(event: APIGatewayProxyEventV2): string | null {
  const authHeader = event.headers?.authorization ?? event.headers?.Authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');

  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    throw new UnauthorizedError('Invalid token');
  }
}

export function requireAuth(event: APIGatewayProxyEventV2): AuthenticatedUser {
  const token = extractBearerToken(event);
  if (!token) throw new UnauthorizedError('No authorization token provided');

  const payload = verifyToken(token);
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    firstName: '',
    lastName: '',
  };
}

export function requireRoles(
  event: APIGatewayProxyEventV2,
  ...roles: UserRole[]
): AuthenticatedUser {
  const user = requireAuth(event);
  if (!roles.includes(user.role)) {
    throw new UnauthorizedError('Insufficient permissions for this action');
  }
  return user;
}
