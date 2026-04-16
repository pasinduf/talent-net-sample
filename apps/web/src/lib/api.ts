export const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

/** Returns Authorization + Content-Type headers using the token stored in localStorage. */
export function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tn_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** SWR-compatible fetcher — adds the stored auth token automatically. */
export function fetcher(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tn_token') : null;
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }).then((r) => r.json());
}

/** Thin fetch wrapper used for mutations (POST / PATCH / DELETE). Throws on non-2xx. */
export async function apiCall(url: string, body?: unknown, method = 'POST') {
  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.error?.message ?? `Server error ${res.status}`);
  return json;
}

const API_BASE = API;

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new ApiError(res.status, (err as any)?.error?.message ?? 'Request failed', err);
  }

  return res.json() as Promise<T>;
}

// ─── Public (no auth) API calls ───────────────────────────────────────────────

export const publicApi = {
  listJobs: (params?: URLSearchParams) =>
    apiFetch<any>(`/public/jobs${params ? `?${params}` : ''}`),

  getJob: (slug: string) => apiFetch<any>(`/public/jobs/${slug}`),
};

// ─── Authenticated API calls ──────────────────────────────────────────────────

export function createAuthApi(token: string) {
  const fetch = <T>(path: string, options: RequestInit = {}) =>
    apiFetch<T>(path, { ...options, token });

  return {
    // Auth
    me: () => fetch<any>('/auth/me'),

    // Jobs
    listJobs: (params?: URLSearchParams) => fetch<any>(`/jobs${params ? `?${params}` : ''}`),
    getJob: (id: string) => fetch<any>(`/jobs/${id}`),
    createJob: (body: unknown) =>
      fetch<any>('/jobs', { method: 'POST', body: JSON.stringify(body) }),
    updateJob: (id: string, body: unknown) =>
      fetch<any>(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    publishJob: (id: string) => fetch<any>(`/jobs/${id}/publish`, { method: 'POST' }),
    pauseJob: (id: string) => fetch<any>(`/jobs/${id}/pause`, { method: 'POST' }),
    closeJob: (id: string) => fetch<any>(`/jobs/${id}/close`, { method: 'POST' }),
    duplicateJob: (id: string) => fetch<any>(`/jobs/${id}/duplicate`, { method: 'POST' }),
    deleteJob: (id: string) => fetch<any>(`/jobs/${id}`, { method: 'DELETE' }),

    // Scoring
    getScoringConfig: (jobId: string) => fetch<any>(`/jobs/${jobId}/scoring`),
    createScoringConfig: (jobId: string, body: unknown) =>
      fetch<any>(`/jobs/${jobId}/scoring`, { method: 'POST', body: JSON.stringify(body) }),
    updateScoringConfig: (jobId: string, body: unknown) =>
      fetch<any>(`/jobs/${jobId}/scoring`, { method: 'PATCH', body: JSON.stringify(body) }),
    addDimension: (jobId: string, body: unknown) =>
      fetch<any>(`/jobs/${jobId}/scoring/dimensions`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateDimension: (jobId: string, dimId: string, body: unknown) =>
      fetch<any>(`/jobs/${jobId}/scoring/dimensions/${dimId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    removeDimension: (jobId: string, dimId: string) =>
      fetch<any>(`/jobs/${jobId}/scoring/dimensions/${dimId}`, { method: 'DELETE' }),
    addKnockoutRule: (jobId: string, body: unknown) =>
      fetch<any>(`/jobs/${jobId}/scoring/knockout-rules`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    removeKnockoutRule: (jobId: string, ruleId: string) =>
      fetch<any>(`/jobs/${jobId}/scoring/knockout-rules/${ruleId}`, { method: 'DELETE' }),
    validateScoringConfig: (jobId: string) => fetch<any>(`/jobs/${jobId}/scoring/validate`),
    listTemplates: () => fetch<any>('/scoring/templates'),
    applyTemplate: (jobId: string, templateId: string) =>
      fetch<any>(`/jobs/${jobId}/scoring/apply-template/${templateId}`, { method: 'POST' }),
  };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}