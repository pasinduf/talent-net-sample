/**
 * /careers — Public job listings page.
 *
 * Uses Incremental Static Regeneration (ISR) via `revalidate`.
 * The page shell is statically generated; job data refreshes every 5 minutes.
 * Filtering is done client-side after initial render.
 */
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { publicApi } from '@/lib/api';
import { JobCard } from '@/components/jobs/JobCard';
import { JobFiltersBar } from '@/components/jobs/JobFiltersBar';
import { EmploymentType, ExperienceLevel } from '@talent-net/types';
import { MOCK_JOBS } from '@/lib/mock-jobs';

export const metadata: Metadata = {
  title: 'Open Roles',
  description: 'Browse all currently open positions at our company.',
};

// ISR: re-generate every 5 minutes so the portal reflects new postings promptly
export const revalidate = 300;

function filterMockJobs(
  jobs: typeof MOCK_JOBS,
  params: { department?: string; level?: string; employmentType?: string; isRemote?: string; search?: string }
) {
  return jobs.filter((job) => {
    if (params.department && !job.department.toLowerCase().includes(params.department.toLowerCase())) return false;
    if (params.level && job.level !== params.level) return false;
    if (params.employmentType && job.employmentType !== params.employmentType) return false;
    if (params.isRemote === 'true' && !job.isRemote) return false;
    if (params.search && !job.title.toLowerCase().includes(params.search.toLowerCase())) return false;
    return true;
  });
}

interface PageProps {
  searchParams: Promise<{
    department?: string;
    level?: string;
    employmentType?: string;
    isRemote?: string;
    search?: string;
  }>;
}

export default async function CareersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const qs = new URLSearchParams();
  if (params.department) qs.set('department', params.department);
  if (params.level) qs.set('level', params.level);
  if (params.employmentType) qs.set('employmentType', params.employmentType);
  if (params.isRemote) qs.set('isRemote', params.isRemote);
  if (params.search) qs.set('search', params.search);
  qs.set('limit', '50');

  let jobs: typeof MOCK_JOBS = [];
  let total = 0;
  try {
   // const jobsData = await publicApi.listJobs(qs);
    jobs = filterMockJobs(MOCK_JOBS, params); //jobsData.data ?? [];
    total = jobs.length //jobsData.meta?.total ?? jobs.length;
  } catch {
    // API unavailable — fall back to mock data
    jobs = filterMockJobs(MOCK_JOBS, params);
    total = jobs.length;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Join Our Team</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          We&apos;re building something great. Find a role where you can make a real impact.
        </p>
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-16 bg-gray-100 rounded-lg animate-pulse mb-8" />}>
        <JobFiltersBar
          currentFilters={{
            department: params.department,
            level: params.level as ExperienceLevel | undefined,
            employmentType: params.employmentType as EmploymentType | undefined,
            isRemote: params.isRemote === 'true',
            search: params.search,
          }}
        />
      </Suspense>

      {/* Results */}
      <div className="mt-8">
        {jobs.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <p className="text-xl font-medium">No open roles found</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {total} role{total !== 1 ? 's' : ''} found
            </p>
            <div className="grid gap-4">
              {jobs.map((job: any) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
