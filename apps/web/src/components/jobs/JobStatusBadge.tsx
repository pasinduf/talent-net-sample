import { clsx } from 'clsx';
import { JobStatus } from '@talent-net/types';

const COLORS: Record<JobStatus, string> = {
  [JobStatus.PUBLISHED]: 'bg-green-100 text-green-700',
  [JobStatus.DRAFT]: 'bg-gray-100 text-gray-600',
  [JobStatus.PAUSED]: 'bg-amber-100 text-amber-700',
  [JobStatus.CLOSED]: 'bg-red-100 text-red-600',
  [JobStatus.ARCHIVED]: 'bg-gray-200 text-gray-500',
};

const LABELS: Record<JobStatus, string> = {
  [JobStatus.PUBLISHED]: 'Open',
  [JobStatus.DRAFT]: 'Draft',
  [JobStatus.PAUSED]: 'Paused',
  [JobStatus.CLOSED]: 'Closed',
  [JobStatus.ARCHIVED]: 'Archived',
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', COLORS[status])}>
      {LABELS[status]}
    </span>
  );
}
