import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { Candidate } from '@talent-net/database';
import { UserRole } from '@talent-net/types';
import { withErrorHandler } from '../../middleware/handler';
import { ok } from '../../shared/response';
import { NotFoundError } from '../../shared/errors';
import { requireRoles } from '../../middleware/auth';
import { db } from '../../shared/db';

/** GET /candidates/me — returns the authenticated candidate's profile. */
async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const actor = requireRoles(event, UserRole.APPLICANT);

  const dataSource = await db();
  const candidateRepo = dataSource.getRepository(Candidate);

  const candidate = await candidateRepo.findOne({ where: { id: actor.id } });
  if (!candidate) throw new NotFoundError('Candidate');

  return ok({
    id: candidate.id,
    email: candidate.email,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    phone: candidate.phone,
    city: candidate.city,
    country: candidate.country,
    linkedInUrl: candidate.linkedInUrl,
    gitHubUrl: candidate.gitHubUrl,
    portfolioUrl: candidate.portfolioUrl,
    websiteUrl: candidate.websiteUrl,
    resumeUrl: candidate.resumeS3Key,
    skills: candidate.skills,
    subscribeToJobAlerts: candidate.subscribeToJobAlerts,
    subscribeToTalentCommunity: candidate.subscribeToTalentCommunity,
  });
}

export const handler = withErrorHandler(handle);
