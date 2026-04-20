'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { EmploymentType, ExperienceLevel, DEPARTMENTS, EMPLOYMENT_TYPES, EXPERIENCE_LEVELS } from '@talent-net/types';

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

  const [searchText, setSearchText] = useState(currentFilters.search ?? '');

  useEffect(() => {
    setSearchText(currentFilters.search ?? '');
  }, [currentFilters.search]);

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

  const hasActive = !!(
    currentFilters.department ||
    currentFilters.level ||
    currentFilters.employmentType ||
    currentFilters.isRemote ||
    currentFilters.search
  );

  function clearAll() {
    router.push(pathname);
  }

  return (
    <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
      {/* Search */}
      <input
        type="text"
        placeholder="Search roles…"
        value={searchText}
        onChange={(e) => {
          setSearchText(e.target.value);
          updateFilter('search', e.target.value || undefined);
        }}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52"
      />

      {/* Department */}
      <select
        value={currentFilters.department ?? ''}
        onChange={(e) => updateFilter('department', e.target.value || undefined)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">All Departments</option>
        {DEPARTMENTS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      {/* Employment type */}
      <select
        value={currentFilters.employmentType ?? ''}
        onChange={(e) => updateFilter('employmentType', e.target.value || undefined)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">All Types</option>
        {Object.entries(EMPLOYMENT_TYPES).map(([type, label]) => (
          <option key={type} value={type}>{label}</option>
        ))}
      </select>

      {/* Level */}
      <select
        value={currentFilters.level ?? ''}
        onChange={(e) => updateFilter('level', e.target.value || undefined)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">All Levels</option>
        {Object.entries(EXPERIENCE_LEVELS).map(([level, label]) => (
          <option key={level} value={level}>{label}</option>
        ))}
      </select>

      {/* Remote toggle */}
      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={currentFilters.isRemote ?? false}
          onChange={(e) => updateFilter('isRemote', e.target.checked ? 'true' : undefined)}
          className="rounded text-indigo-600 focus:ring-indigo-400"
        />
        Remote only
      </label>

      {hasActive && (
        <button
          onClick={clearAll}
          title="Clear filters"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
