'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { useConfirmModal } from '@/components/ui/ConfirmModal';
import {
  JobStatus,
  EmploymentType,
  ExperienceLevel,
  InterviewType,
  QuestionType,
} from '@talent-net/types';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

function fetcher(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tn_token') : null;
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }).then((r) => r.json());
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: 'Draft',
  [JobStatus.PUBLISHED]: 'Published',
  [JobStatus.PAUSED]: 'Paused',
  [JobStatus.CLOSED]: 'Closed',
  [JobStatus.ARCHIVED]: 'Archived',
};

const STATUS_COLORS: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: 'bg-gray-100 text-gray-700 border-gray-200',
  [JobStatus.PUBLISHED]: 'bg-green-100 text-green-700 border-green-200',
  [JobStatus.PAUSED]: 'bg-amber-100 text-amber-700 border-amber-200',
  [JobStatus.CLOSED]: 'bg-red-100 text-red-700 border-red-200',
  [JobStatus.ARCHIVED]: 'bg-gray-200 text-gray-500 border-gray-300',
};

const LEVEL_LABELS: Record<ExperienceLevel, string> = {
  [ExperienceLevel.ENTRY]: 'Entry Level',
  [ExperienceLevel.JUNIOR]: 'Junior',
  [ExperienceLevel.MID]: 'Mid Level',
  [ExperienceLevel.SENIOR]: 'Senior',
  [ExperienceLevel.LEAD]: 'Lead',
  [ExperienceLevel.EXECUTIVE]: 'Executive',
};

const TYPE_LABELS: Record<EmploymentType, string> = {
  [EmploymentType.FULL_TIME]: 'Full-time',
  [EmploymentType.PART_TIME]: 'Part-time',
  [EmploymentType.CONTRACT]: 'Contract',
  [EmploymentType.INTERNSHIP]: 'Internship',
  [EmploymentType.FREELANCE]: 'Freelance',
};

const INTERVIEW_LABELS: Record<InterviewType, string> = {
  [InterviewType.TAKE_HOME]: 'Take-home Assignment',
  [InterviewType.AI]: 'AI Interview',
  [InterviewType.MANUAL]: 'Manual Interview',
  [InterviewType.HYBRID]: 'Hybrid (AI + Manual)',
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.TEXT]: 'Short text',
  [QuestionType.TEXTAREA]: 'Long text',
  [QuestionType.YES_NO]: 'Yes / No',
  [QuestionType.SINGLE_CHOICE]: 'Single choice',
  [QuestionType.MULTI_CHOICE]: 'Multiple choice',
  [QuestionType.NUMERIC]: 'Number',
  [QuestionType.DATE]: 'Date',
  [QuestionType.FILE_UPLOAD]: 'File upload',
  [QuestionType.VIDEO_RESPONSE]: 'Video response',
};

// ─── Helper components ────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-sm text-gray-500 w-40 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value ?? '—'}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading, mutate } = useSWR(`${API}/jobs/${id}`, fetcher);
  const job: any = data?.data;

  const { confirm, confirmModal } = useConfirmModal();

  type JobAction = 'publish' | 'pause' | 'close' | 'archive' | 'reopen' | 'duplicate';

  const ACTION_LABELS: Record<JobAction, string> = {
    publish: 'Publishing',
    pause: 'Pausing',
    close: 'Closing',
    archive: 'Archiving',
    reopen: 'Reopening',
    duplicate: 'Duplicating',
  };

  const ACTION_SUCCESS: Record<JobAction, string> = {
    publish: 'Job published!',
    pause: 'Job paused.',
    close: 'Job closed.',
    archive: 'Job archived.',
    reopen: 'Job reopened!',
    duplicate: 'Job duplicated — opening draft…',
  };

  const CONFIRM_OPTIONS: Partial<Record<JobAction, { title: string; description: string; confirmLabel: string; variant?: 'danger' | 'warning' }>> = {
    publish: { title: 'Publish this job?',  description: 'The listing will become publicly visible on the careers portal immediately.',      confirmLabel: 'Publish',  variant: 'warning' },
    pause:   { title: 'Pause this job?',    description: 'The listing will be hidden from the careers portal until reopened.',               confirmLabel: 'Pause',    variant: 'warning' },
    close:   { title: 'Close this job?',    description: 'No new applications will be accepted. This cannot be undone without reopening.',   confirmLabel: 'Close',    variant: 'danger'  },
    archive: { title: 'Archive this job?',  description: 'The job will be archived and can no longer be reopened.',                          confirmLabel: 'Archive',  variant: 'danger'  },
  };

  async function runAction(action: JobAction) {
    const opts = CONFIRM_OPTIONS[action];
    if (opts) {
      const ok = await confirm({ ...opts });
      if (!ok) return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('tn_token') : null;
    const toastId = toast.loading(`${ACTION_LABELS[action]} job...`);
    try {
      const res = await fetch(`${API}/jobs/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.error?.message ?? `Failed (${res.status})`);
      }
      toast.success(ACTION_SUCCESS[action], { id: toastId });

      if (action === 'duplicate') {
        const body = await res.json();
        const newId: string = body?.data?.id;
        if (newId) router.push(`/admin/jobs/${newId}`);
        else mutate();
      } else {
        mutate();
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Action failed.', { id: toastId });
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-sm text-gray-500">Loading job...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <div className="text-sm text-red-600">Job not found.</div>
        <Link href="/admin/jobs" className="mt-3 text-sm text-indigo-600 hover:underline">
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  const status: JobStatus = job.status;
  const salary =
    job.salaryMin || job.salaryMax
      ? [
          job.salaryMin ? job.salaryMin.toLocaleString() : null,
          job.salaryMax ? job.salaryMax.toLocaleString() : null,
        ]
          .filter(Boolean)
          .join(' – ') + ` ${job.salaryCurrency ?? ''}`
      : null;

  return (
    <>
    {confirmModal}
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/admin/jobs" className="text-sm text-gray-500 hover:text-gray-700">
              ← Jobs
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">{job.department}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={clsx(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                STATUS_COLORS[status]
              )}
            >
              {STATUS_LABELS[status]}
            </span>
            {job.publishedAt && (
              <span className="text-xs text-gray-500">
                Published {new Date(job.publishedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {/* Edit — only for non-terminal states */}
          {status !== JobStatus.ARCHIVED && (
            <Link
              href={`/admin/jobs/${id}/edit`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Edit
            </Link>
          )}

          {/* Duplicate — always available */}
          <button
            onClick={() => runAction('duplicate')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Duplicate
          </button>

          {/* DRAFT → Publish */}
          {status === JobStatus.DRAFT && (
            <button
              onClick={() => runAction('publish')}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Publish
            </button>
          )}

          {/* PUBLISHED → Pause */}
          {status === JobStatus.PUBLISHED && (
            <button
              onClick={() => runAction('pause')}
              className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              Pause
            </button>
          )}

          {/* PAUSED → Reopen */}
          {status === JobStatus.PAUSED && (
            <button
              onClick={() => runAction('reopen')}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Reopen
            </button>
          )}

          {/* PUBLISHED | PAUSED → Close */}
          {(status === JobStatus.PUBLISHED || status === JobStatus.PAUSED) && (
            <button
              onClick={() => runAction('close')}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Close
            </button>
          )}

          {/* CLOSED → Archive */}
          {status === JobStatus.CLOSED && (
            <button
              onClick={() => runAction('archive')}
              className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-800"
            >
              Archive
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — main details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Role Details */}
          <Section title="Role Details">
            <div className="space-y-3">
              <InfoRow label="Department" value={job.department} />
              <InfoRow label="Level" value={LEVEL_LABELS[job.level as ExperienceLevel] ?? job.level} />
              <InfoRow label="Employment type" value={TYPE_LABELS[job.employmentType as EmploymentType] ?? job.employmentType} />
              <InfoRow
                label="Location"
                value={
                  <>
                    {job.location}
                    {job.isRemote && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        Remote
                      </span>
                    )}
                  </>
                }
              />
              {salary && <InfoRow label="Salary" value={salary} />}
              {job.headcount && <InfoRow label="Headcount" value={job.headcount} />}
              {job.applicationDeadline && (
                <InfoRow
                  label="Deadline"
                  value={new Date(job.applicationDeadline).toLocaleDateString()}
                />
              )}
            </div>
          </Section>

          {/* Description */}
          <Section title="Job Description">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {job.description}
            </p>
          </Section>

          {/* Screening questions */}
          {job.applicationForm?.screeningQuestions?.length > 0 && (
            <Section title={`Screening Questions (${job.applicationForm.screeningQuestions.length})`}>
              <ol className="space-y-3">
                {job.applicationForm.screeningQuestions.map((q: any, i: number) => (
                  <li key={q.id} className="flex gap-3">
                    <span className="text-sm text-gray-400 w-5 flex-shrink-0 pt-0.5">{i + 1}.</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {QUESTION_TYPE_LABELS[q.type as QuestionType] ?? q.type}
                        </span>
                        {q.isRequired && (
                          <span className="text-xs bg-red-50 text-red-600 px-1 rounded">Required</span>
                        )}
                        {q.isKnockout && (
                          <span className="text-xs bg-orange-50 text-orange-600 px-1 rounded">Knockout</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </div>

        {/* Right column — sidebar */}
        <div className="space-y-6">
          {/* Interview stages */}
          <Section title="Interview Stages">
            {job.interviewTypes?.length > 0 ? (
              <ul className="space-y-2">
                {job.interviewTypes.map((t: InterviewType) => (
                  <li key={t} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    {INTERVIEW_LABELS[t] ?? t}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">None configured</p>
            )}
          </Section>

          {/* Scoring summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Scoring Configuration</h2>
              <Link
                href={`/admin/jobs/${id}/scoring`}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {job.hasScoringConfig ? 'Edit' : 'Configure'}
              </Link>
            </div>
            {job.hasScoringConfig ? (
              <div className="space-y-2">
                <InfoRow
                  label="Shortlist threshold"
                  value={`${job.scoringConfig.shortlistThreshold}%`}
                />
                <InfoRow
                  label="Pass threshold"
                  value={`${job.scoringConfig.passThreshold}%`}
                />
                <InfoRow
                  label="Dimensions"
                  value={job.scoringConfig.dimensionCount}
                />
                <InfoRow
                  label="Knockout rules"
                  value={job.scoringConfig.knockoutRuleCount}
                />
                <InfoRow
                  label="Weight balanced"
                  value={job.scoringConfig.isWeightBalanced ? 'Yes' : 'No'}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-400">No scoring config</p>
            )}
          </div>

          {/* Meta */}
          <Section title="Metadata">
            <div className="space-y-2">
              <InfoRow label="Created by" value={job.createdBy?.fullName ?? '—'} />
              <InfoRow
                label="Created"
                value={new Date(job.createdAt).toLocaleDateString()}
              />
              <InfoRow
                label="Updated"
                value={new Date(job.updatedAt).toLocaleDateString()}
              />
              {job.slug && <InfoRow label="Slug" value={job.slug} />}
            </div>
          </Section>
        </div>
      </div>
    </div>
    </>
  );
}
