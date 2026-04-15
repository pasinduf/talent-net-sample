'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { EmploymentType, ExperienceLevel } from '@talent-net/types';

interface JobFiltersBarProps {
  currentFilters: {
    department?: string;
    level?: ExperienceLevel;
    employmentType?: EmploymentType;
    isRemote?: boolean;
    search?: string;
  };
}

export function JobFiltersBar({ currentFilters }: JobFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
      {/* Search */}
      <input
        type="text"
        placeholder="Search roles…"
        defaultValue={currentFilters.search ?? ''}
        onChange={(e) => updateFilter('search', e.target.value || undefined)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52"
      />

      {/* Employment type */}
      <select
        defaultValue={currentFilters.employmentType ?? ''}
        onChange={(e) => updateFilter('employmentType', e.target.value || undefined)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">All Types</option>
        <option value={EmploymentType.FULL_TIME}>Full-time</option>
        <option value={EmploymentType.PART_TIME}>Part-time</option>
        <option value={EmploymentType.CONTRACT}>Contract</option>
        <option value={EmploymentType.INTERNSHIP}>Internship</option>
      </select>

      {/* Level */}
      <select
        defaultValue={currentFilters.level ?? ''}
        onChange={(e) => updateFilter('level', e.target.value || undefined)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">All Levels</option>
        <option value={ExperienceLevel.ENTRY}>Entry</option>
        <option value={ExperienceLevel.JUNIOR}>Junior</option>
        <option value={ExperienceLevel.MID}>Mid</option>
        <option value={ExperienceLevel.SENIOR}>Senior</option>
        <option value={ExperienceLevel.LEAD}>Lead</option>
        <option value={ExperienceLevel.EXECUTIVE}>Executive</option>
      </select>

      {/* Remote toggle */}
      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={currentFilters.isRemote}
          onChange={(e) => updateFilter('isRemote', e.target.checked ? 'true' : undefined)}
          className="rounded text-indigo-600 focus:ring-indigo-400"
        />
        Remote only
      </label>
    </div>
  );
}
