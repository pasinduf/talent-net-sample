import Link from 'next/link';
import { JobStatus, EmploymentType, ExperienceLevel } from '@talent-net/types';
import { JobStatusBadge } from './JobStatusBadge';
import { EmploymentTypeBadge } from './EmploymentTypeBadge';

interface JobCardProps {
  job: {
    id: string;
    title: string;
    slug: string;
    department: string;
    level: ExperienceLevel;
    employmentType: EmploymentType;
    location: string;
    isRemote: boolean;
    status: JobStatus;
    applicationDeadline?: string | null;
    publishedAt?: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    salaryCurrency?: string | null;
  };
}

export function JobCard({ job }: JobCardProps) {
  const deadline = job.applicationDeadline ? new Date(job.applicationDeadline) : null;
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Link
      href={`/careers/${job.slug}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <JobStatusBadge status={job.status} />
            <EmploymentTypeBadge type={job.employmentType} />
            {job.isRemote && (
              <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                Remote
              </span>
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors truncate">
            {job.title}
          </h3>

          <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
            <span>{job.department}</span>
            <span>·</span>
            <span>{job.location}{job.isRemote ? ' / Remote' : ''}</span>
            <span>·</span>
            <span className="capitalize">{job.level.replace('_', ' ')}</span>
            {job.salaryMin && job.salaryMax && (
              <>
                <span>·</span>
                <span>
                  {job.salaryCurrency}{' '}
                  {Number(job.salaryMin).toLocaleString()}–{Number(job.salaryMax).toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          {daysLeft !== null && daysLeft > 0 && (
            <span className={`text-xs font-medium ${daysLeft <= 7 ? 'text-red-500' : 'text-gray-400'}`}>
              {daysLeft}d left
            </span>
          )}
          <div className="mt-2 text-indigo-600 group-hover:translate-x-1 transition-transform text-sm">
            Apply →
          </div>
        </div>
      </div>
    </Link>
  );
}
