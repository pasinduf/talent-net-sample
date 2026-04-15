import { EmploymentType } from '@talent-net/types';

const LABELS: Record<EmploymentType, string> = {
  [EmploymentType.FULL_TIME]: 'Full-time',
  [EmploymentType.PART_TIME]: 'Part-time',
  [EmploymentType.CONTRACT]: 'Contract',
  [EmploymentType.INTERNSHIP]: 'Internship',
  [EmploymentType.FREELANCE]: 'Freelance',
};

export function EmploymentTypeBadge({ type }: { type: EmploymentType }) {
  return (
    <span className="px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-full">
      {LABELS[type]}
    </span>
  );
}
