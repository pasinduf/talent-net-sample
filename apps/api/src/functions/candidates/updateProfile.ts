import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import { Candidate } from '@talent-net/database';
import { UserRole } from '@talent-net/types';
import { withErrorHandler, parseBody } from '../../middleware/handler';
import { ok } from '../../shared/response';
import { NotFoundError } from '../../shared/errors';
import { requireRoles } from '../../middleware/auth';
import { db } from '../../shared/db';

const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).nullable().optional(),
  city: z.string().max(255).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  linkedInUrl: z.string().url().max(500).nullable().optional(),
  gitHubUrl: z.string().url().max(500).nullable().optional(),
  portfolioUrl: z.string().url().max(500).nullable().optional(),
  websiteUrl: z.string().url().max(500).nullable().optional(),
  resumeUrl: z.string().url().max(1000).nullable().optional(),
  subscribeToJobAlerts: z.boolean().optional(),
  subscribeToTalentCommunity: z.boolean().optional(),
});

/** PATCH /candidates/me — updates the authenticated candidate's profile. */
async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = requireRoles(event, UserRole.APPLICANT);

  const dataSource = await db();
  const candidateRepo = dataSource.getRepository(Candidate);

  const candidate = await candidateRepo.findOne({ where: { id: actor.id } });
  if (!candidate) throw new NotFoundError('Candidate');

  const body = parseBody(event);
  const input = UpdateProfileSchema.parse(body);

  if (input.firstName !== undefined) candidate.firstName = input.firstName;
  if (input.lastName !== undefined) candidate.lastName = input.lastName;
  if (input.phone !== undefined) candidate.phone = input.phone ?? null;
  if (input.city !== undefined) candidate.city = input.city ?? null;
  if (input.country !== undefined) candidate.country = input.country ?? null;
  if (input.linkedInUrl !== undefined) candidate.linkedInUrl = input.linkedInUrl ?? null;
  if (input.gitHubUrl !== undefined) candidate.gitHubUrl = input.gitHubUrl ?? null;
  if (input.portfolioUrl !== undefined) candidate.portfolioUrl = input.portfolioUrl ?? null;
  if (input.websiteUrl !== undefined) candidate.websiteUrl = input.websiteUrl ?? null;
  if (input.resumeUrl !== undefined) candidate.resumeS3Key = input.resumeUrl ?? null;
  if (input.subscribeToJobAlerts !== undefined) candidate.subscribeToJobAlerts = input.subscribeToJobAlerts;
  if (input.subscribeToTalentCommunity !== undefined) candidate.subscribeToTalentCommunity = input.subscribeToTalentCommunity;

  const saved = await candidateRepo.save(candidate);

  return ok({
    id: saved.id,
    email: saved.email,
    firstName: saved.firstName,
    lastName: saved.lastName,
    phone: saved.phone,
    city: saved.city,
    country: saved.country,
    linkedInUrl: saved.linkedInUrl,
    gitHubUrl: saved.gitHubUrl,
    portfolioUrl: saved.portfolioUrl,
    websiteUrl: saved.websiteUrl,
    resumeUrl: saved.resumeS3Key,
    subscribeToJobAlerts: saved.subscribeToJobAlerts,
    subscribeToTalentCommunity: saved.subscribeToTalentCommunity,
  });
}

export const handler = withErrorHandler(handle);
