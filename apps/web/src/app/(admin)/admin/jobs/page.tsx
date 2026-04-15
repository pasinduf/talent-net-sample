'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { clsx } from 'clsx';
import { JobStatus, EmploymentType, ExperienceLevel } from '@talent-net/types';

// --- Simple SWR fetcher using stored token ---
function fetcher(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tn_token') : null;
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

const STATUS_COLORS: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: 'bg-gray-100 text-gray-700',
  [JobStatus.PUBLISHED]: 'bg-green-100 text-green-700',
  [JobStatus.PAUSED]: 'bg-amber-100 text-amber-700',
  [JobStatus.CLOSED]: 'bg-red-100 text-red-700',
  [JobStatus.ARCHIVED]: 'bg-gray-200 text-gray-500',
};

export default function JobsListPage() {
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const qs = new URLSearchParams({ page: String(page), limit: '20' });
  if (status) qs.set('status', status);
  if (search) qs.set('search', search);

  const { data, isLoading, mutate } = useSWR(`${API}/jobs?${qs}`, fetcher);

  const jobs: any[] = data?.data ?? [];
  const meta = data?.meta ?? {};

  async function changeStatus(jobId: string, action: 'publish' | 'pause' | 'close') {
    const token = localStorage.getItem('tn_token');
    await fetch(`${API}/jobs/${jobId}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    mutate();
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">Manage job postings and their configurations</p>
        </div>
        <Link
          href="/admin/jobs/new"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + New Job
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search jobs…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as JobStatus | ''); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          {Object.values(JobStatus).map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 animate-pulse">Loading jobs…</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No jobs found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3">Title</th>
                <th className="text-left px-5 py-3">Department</th>
                <th className="text-left px-5 py-3">Level</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Scoring</th>
                <th className="text-left px-5 py-3">Published</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job: any) => (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900">
                    <Link href={`/admin/jobs/${job.id}`} className="hover:text-indigo-600">
                      {job.title}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{job.department}</td>
                  <td className="px-5 py-4 text-gray-600 capitalize">{job.level}</td>
                  <td className="px-5 py-4">
                    <span className={clsx('px-2 py-1 rounded-full text-xs font-medium capitalize', STATUS_COLORS[job.status as JobStatus])}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {job.hasScoringConfig ? (
                      <span className="text-green-600 text-xs font-medium">✓ Configured</span>
                    ) : (
                      <Link
                        href={`/admin/jobs/${job.id}/scoring`}
                        className="text-amber-600 text-xs font-medium underline"
                      >
                        Setup required
                      </Link>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    {job.publishedAt
                      ? new Date(job.publishedAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/jobs/${job.id}/scoring`}
                        className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Scoring
                      </Link>
                      {job.status === JobStatus.DRAFT && (
                        <button
                          onClick={() => changeStatus(job.id, 'publish')}
                          className="px-2.5 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Publish
                        </button>
                      )}
                      {job.status === JobStatus.PUBLISHED && (
                        <button
                          onClick={() => changeStatus(job.id, 'pause')}
                          className="px-2.5 py-1 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                        >
                          Pause
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-end gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">
            {page} / {meta.totalPages}
          </span>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
