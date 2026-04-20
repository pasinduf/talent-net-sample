'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setCandidateToken } from '@/lib/candidateAuth';
import { API } from '@/lib/api';

export default function LinkedInCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('LinkedIn sign-in was cancelled or failed. Please try again.');
      return;
    }

    if (!code) {
      setError('No authorisation code received from LinkedIn.');
      return;
    }

    let returnUrl = '/careers';
    try {
      if (state) {
        const parsed = JSON.parse(decodeURIComponent(state));
        if (parsed.returnUrl) returnUrl = parsed.returnUrl;
      }
    } catch {
      // ignore malformed state
    }

    const redirectUri =
      typeof window !== 'undefined'
        ? `${window.location.origin}/careers/auth/callback`
        : '';

    fetch(`${API}/auth/candidate/linkedin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error?.message ?? 'Authentication failed');
        return json;
      })
      .then((json) => {
        setCandidateToken(json?.data?.token);
        router.replace(returnUrl);
      })
      .catch((err: Error) => {
        setError(err.message || 'Something went wrong. Please try again.');
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <span className="text-red-600 text-xl">!</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Sign-in failed</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">{error}</p>
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Signing you in with LinkedIn…</p>
    </div>
  );
}
