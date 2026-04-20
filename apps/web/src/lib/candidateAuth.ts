const TOKEN_KEY = 'tn_candidate_token';

export function getCandidateToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setCandidateToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearCandidateToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function buildLinkedInAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID ?? '';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export function candidateFetcher(url: string) {
  const token = getCandidateToken();
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }).then((r) => r.json());
}

export async function candidateApiCall(url: string, body?: unknown, method = 'POST') {
  const token = getCandidateToken();
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.error?.message ?? `Server error ${res.status}`);
  return json;
}
