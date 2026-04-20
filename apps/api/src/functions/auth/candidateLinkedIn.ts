import 'reflect-metadata';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { Candidate } from '@talent-net/database';
import { UserRole, JwtPayload } from '@talent-net/types';
import { withErrorHandler, parseBody } from '../../middleware/handler';
import { ok } from '../../shared/response';
import { UnauthorizedError } from '../../shared/errors';
import { db } from '../../shared/db';

const BodySchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
});

/**
 * POST /auth/candidate/linkedin
 *
 * Exchanges a LinkedIn authorization code for a candidate JWT.
 * Creates the Candidate record on first sign-in; links SSO ID on subsequent ones.
 *
 * Required env vars: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, JWT_SECRET
 */
async function handle(
  event: APIGatewayProxyEventV2,
  _context: Context
): Promise<APIGatewayProxyResultV2> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new UnauthorizedError('LinkedIn SSO is not configured on this server');
  }

  const body = parseBody(event);
  const { code, redirectUri } = BodySchema.parse(body);

  // ── Exchange authorization code for access token ──────────────────────────

  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error('[LinkedIn] token exchange failed:', text);
    throw new UnauthorizedError('Failed to authenticate with LinkedIn');
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };

  // ── Fetch profile via LinkedIn OpenID Connect userinfo ────────────────────

  const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileRes.ok) {
    throw new UnauthorizedError('Failed to retrieve LinkedIn profile');
  }

  const profile = (await profileRes.json()) as {
    sub: string;
    email: string;
    given_name: string;
    family_name: string;
  };

  if (!profile.email) {
    throw new UnauthorizedError(
      'Your LinkedIn account does not have a verified email address'
    );
  }

  const email = profile.email.toLowerCase();

  // ── Find or create candidate ──────────────────────────────────────────────

  const dataSource = await db();
  const candidateRepo = dataSource.getRepository(Candidate);

  let candidate = await candidateRepo.findOne({
    where: { ssoProvider: 'linkedin', ssoProviderId: profile.sub },
  });

  if (!candidate) {
    // Email match — candidate may have applied without SSO previously
    candidate = await candidateRepo.findOne({ where: { email } });
  }

  if (candidate) {
    if (!candidate.ssoProviderId) {
      candidate.ssoProvider = 'linkedin';
      candidate.ssoProviderId = profile.sub;
      await candidateRepo.save(candidate);
    }
  } else {
    candidate = await candidateRepo.save(
      candidateRepo.create({
        email,
        firstName: profile.given_name,
        lastName: profile.family_name,
        ssoProvider: 'linkedin',
        ssoProviderId: profile.sub,
      })
    );
  }

  // ── Issue candidate JWT ───────────────────────────────────────────────────

  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';

  const payload: JwtPayload = {
    sub: candidate.id,
    email: candidate.email,
    role: UserRole.APPLICANT,
  };

  const token = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

  return ok({
    token,
    candidate: {
      id: candidate.id,
      email: candidate.email,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
    },
  });
}

export const handler = withErrorHandler(handle);
