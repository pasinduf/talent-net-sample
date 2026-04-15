import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors.js';
import { error, serverError, badRequest } from '../shared/response.js';
import { ErrorCode } from '@talent-net/types';

type HandlerFn = (
  event: APIGatewayProxyEventV2,
  context: Context
) => Promise<APIGatewayProxyResultV2>;

/**
 * Wraps a Lambda handler with centralised error handling.
 * Catches AppError, ZodError, and unknown errors uniformly.
 */
export function withErrorHandler(fn: HandlerFn): HandlerFn {
  return async (event, context) => {
    try {
      return await fn(event, context);
    } catch (err) {
      if (err instanceof AppError) {
        return error(err.statusCode, err.code, err.message, err.details);
      }

      if (err instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const key = issue.path.join('.');
          details[key] = [...(details[key] ?? []), issue.message];
        }
        return badRequest('Validation failed', details);
      }

      console.error('[Lambda Error]', err);
      return serverError();
    }
  };
}

/**
 * Parses JSON body from an API Gateway event.
 * Throws a ValidationError if the body is missing or malformed.
 */
export function parseBody<T = Record<string, unknown>>(event: APIGatewayProxyEventV2): T {
  if (!event.body) {
    throw Object.assign(new Error('Request body is required'), {
      statusCode: 400,
      code: ErrorCode.INVALID_INPUT,
    });
  }
  try {
    return JSON.parse(event.body) as T;
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), {
      statusCode: 400,
      code: ErrorCode.INVALID_INPUT,
    });
  }
}

/**
 * Extracts pagination params from query string.
 */
export function parsePagination(event: APIGatewayProxyEventV2): {
  page: number;
  limit: number;
} {
  const qs = event.queryStringParameters ?? {};
  const page = Math.max(1, parseInt(qs.page ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(qs.limit ?? '20', 10)));
  return { page, limit };
}
