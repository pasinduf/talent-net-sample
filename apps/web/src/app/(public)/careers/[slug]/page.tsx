/**
 * /careers/[slug] — Individual job description page.
 *
 * Fully statically generated at build time via generateStaticParams.
 * Falls back to on-demand generation (blocking) for new jobs published
 * after the last build, then ISR re-validates every 5 minutes.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { EmploymentTypeBadge } from '@/components/jobs/EmploymentTypeBadge';
import { JobStatus } from '@talent-net/types';
import { getMockJobBySlug, MOCK_JOBS } from '@/lib/mock-jobs';

export const revalidate = 300;
export const dynamicParams = true; // Allow new slugs to be generated on-demand

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const qs = new URLSearchParams({ limit: '200' });
    const data = await publicApi.listJobs(qs);
    return (data.data ?? []).map((j: any) => ({ slug: j.slug as string }));
  } catch {
    return MOCK_JOBS.map((j) => ({ slug: j.slug }));
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await publicApi.getJob(slug);
    const job = data.data;
    return {
      title: `${job.title} — ${job.department}`,
      description: job.description.slice(0, 160),
    };
  } catch {
    const mock = getMockJobBySlug(slug);
    if (mock) return { title: `${mock.title} — ${mock.department}` };
    return { title: 'Job Not Found' };
  }
}

export default async function JobDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let job: any;
  try {
    const data = await publicApi.getJob(slug);
    job = data.data;
  } catch {
    job = getMockJobBySlug(slug);
  }

  if (!job || job.status !== JobStatus.PUBLISHED) notFound();

  const screeningQuestions = job.applicationForm?.screeningQuestions ?? [];
  const deadline = job.applicationDeadline ? new Date(job.applicationDeadline) : null;
  const isPastDeadline = deadline ? deadline < new Date() : false;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/careers" className="hover:text-indigo-600">
          Open Roles
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">{job.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <JobStatusBadge status={job.status} />
          <EmploymentTypeBadge type={job.employmentType} />
          {job.isRemote && (
            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
              Remote
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>{job.department}</span>
          <span>·</span>
          <span>{job.location}</span>
          <span>·</span>
          <span className="capitalize">{job.level.replace('_', ' ')}</span>
          {job.salaryMin && job.salaryMax && (
            <>
              <span>·</span>
              <span>
                {job.salaryCurrency} {Number(job.salaryMin).toLocaleString()} –{' '}
                {Number(job.salaryMax).toLocaleString()}
              </span>
            </>
          )}
        </div>
        {deadline && (
          <p className={`mt-2 text-sm ${isPastDeadline ? 'text-red-600' : 'text-amber-600'}`}>
            {isPastDeadline
              ? 'Applications closed'
              : `Apply before ${deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Description */}
        <article className="lg:col-span-2">
          <div
            className="prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: job.description }}
          />

          {/* What to expect in the process */}
          {job.interviewTypes?.length > 0 && (
            <div className="mt-10 p-5 rounded-xl bg-indigo-50 border border-indigo-100">
              <h3 className="font-semibold text-indigo-900 mb-2">Interview Process</h3>
              <ul className="text-sm text-indigo-800 space-y-1 list-disc list-inside">
                {job.interviewTypes.map((type: string) => (
                  <li key={type} className="capitalize">
                    {type.replace('_', ' ')} interview
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Privacy notice */}
          <p className="mt-10 text-xs text-gray-400">
            By applying, you agree to the processing of your personal data as described in our{' '}
            <Link href="/privacy" className="underline hover:text-gray-600">
              Privacy Notice
            </Link>
            . You may withdraw consent or request data deletion at any time.
          </p>
        </article>

        {/* Sidebar: CTA + quick facts */}
        <aside className="space-y-6">
          {!isPastDeadline ? (
            <Link
              href={`/careers/${slug}/apply`}
              className="block w-full text-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Apply for This Role
            </Link>
          ) : (
            <div className="text-center px-6 py-3 bg-gray-100 text-gray-500 font-medium rounded-xl">
              Applications Closed
            </div>
          )}

          {/* Quick facts */}
          <div className="rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
              Role Details
            </h3>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-500">Department</dt>
                <dd className="text-gray-800 font-medium">{job.department}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Level</dt>
                <dd className="text-gray-800 font-medium capitalize">
                  {job.level.replace('_', ' ')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Type</dt>
                <dd className="text-gray-800 font-medium capitalize">
                  {job.employmentType.replace('_', ' ')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Location</dt>
                <dd className="text-gray-800 font-medium">
                  {job.isRemote ? `${job.location} / Remote` : job.location}
                </dd>
              </div>
            </dl>
          </div>

          {/* Screening questions preview */}
          {screeningQuestions.length > 0 && (
            <div className="rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-3">
                Application Questions
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                {screeningQuestions.map((q: any) => (
                  <li key={q.id} className="flex items-start gap-2">
                    <span className="mt-0.5 text-indigo-400">›</span>
                    <span>
                      {q.question}
                      {q.isRequired && (
                        <span className="ml-1 text-red-500 text-xs">*required</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
