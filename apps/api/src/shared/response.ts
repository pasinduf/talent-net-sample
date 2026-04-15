import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { ApiResponse, ApiErrorResponse, ErrorCode, PaginationMeta } from '@talent-net/types';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
};

export function ok<T>(data: T, meta?: PaginationMeta, statusCode = 200): APIGatewayProxyResultV2 {
  const body: ApiResponse<T> = { success: true, data, ...(meta ? { meta } : {}) };
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body),
  };
}

export function created<T>(data: T): APIGatewayProxyResultV2 {
  return ok(data, undefined, 201);
}

export function noContent(): APIGatewayProxyResultV2 {
  return { statusCode: 204, headers: defaultHeaders, body: '' };
}

export function error(
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: Record<string, string[]>
): APIGatewayProxyResultV2 {
  const body: ApiErrorResponse = {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  };
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body),
  };
}

export const badRequest = (message: string, details?: Record<string, string[]>) =>
  error(400, ErrorCode.VALIDATION_ERROR, message, details);

export const unauthorized = (message = 'Unauthorized') =>
  error(401, ErrorCode.UNAUTHORIZED, message);

export const forbidden = (message = 'Forbidden') =>
  error(403, ErrorCode.FORBIDDEN, message);

export const notFound = (resource: string) =>
  error(404, ErrorCode.NOT_FOUND, `${resource} not found`);

export const conflict = (message: string) =>
  error(409, ErrorCode.CONFLICT, message);

export const businessError = (code: ErrorCode, message: string) =>
  error(422, code, message);

export const serverError = (message = 'Internal server error') =>
  error(500, ErrorCode.INTERNAL_ERROR, message);
