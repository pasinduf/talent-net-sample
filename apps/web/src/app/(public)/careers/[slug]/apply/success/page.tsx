'use client';

import { use } from 'react';
import Link from 'next/link';

export default function ApplicationSuccessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Application submitted!</h1>
      <p className="text-sm text-gray-500 max-w-sm mb-8">
        Thank you for applying. We'll review your application and be in touch with next steps.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/careers/${slug}`}
          className="px-5 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Back to job
        </Link>
        <Link
          href="/careers"
          className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Browse more roles
        </Link>
      </div>
    </div>
  );
}
