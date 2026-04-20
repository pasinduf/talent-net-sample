import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import crypto from 'crypto';
import { UserRole } from '@talent-net/types';
import { withErrorHandler, parseBody } from '../../middleware/handler';
import { ok } from '../../shared/response';
import { requireRoles } from '../../middleware/auth';

const BodySchema = z.object({
  folder: z.string().min(1).max(200),
  publicId: z.string().min(1).max(200).optional(),
  resourceType: z.enum(['image', 'video', 'raw', 'auto']).default('auto'),
});

/**
 * Generates a Cloudinary SHA-256 upload signature.
 * Params must be sorted alphabetically and joined as key=value pairs.
 * See: https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
 */
function signCloudinaryUpload(
  params: Record<string, string | number>,
  apiSecret: string
): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto
    .createHash('sha256')
    .update(toSign + apiSecret)
    .digest('hex');
}

/**
 * POST /uploads/cloudinary-sign
 *
 * Returns a signed parameter set for a direct Cloudinary upload.
 * The client uploads directly to Cloudinary using these params — no file
 * bytes pass through the API server.
 *
 * Required env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  requireRoles(event, UserRole.APPLICANT);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured on this server');
  }

  const body = parseBody(event);
  const { folder, publicId, resourceType } = BodySchema.parse(body);

  const timestamp = Math.round(Date.now() / 1000);

  const params: Record<string, string | number> = {
    folder,
    timestamp,
    ...(publicId ? { public_id: publicId } : {}),
  };

  const signature = signCloudinaryUpload(params, apiSecret);

  return ok({
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
    resourceType,
  });
}

export const handler = withErrorHandler(handle);
