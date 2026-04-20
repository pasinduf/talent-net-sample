'use client';

import { use, useState } from 'react';
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
import { API, fetcher, apiCall } from '@/lib/api';
import { ArrowLeft, Pencil } from 'lucide-react';

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500';

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
};

const CHOICE_TYPES = [QuestionType.SINGLE_CHOICE, QuestionType.MULTI_CHOICE];

interface QuestionForm {
  question: string;
  type: QuestionType;
  isRequired: boolean;
  isKnockout: boolean;
  options: string[];
  knockoutAnswers: string;
  helpText: string;
}

const DEFAULT_QUESTION: QuestionForm = {
  question: '',
  type: QuestionType.TEXT,
  isRequired: false,
  isKnockout: false,
  options: [],
  knockoutAnswers: '',
  helpText: '',
};

// ─── Options editor ───────────────────────────────────────────────────────────

function OptionsEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');

  function add() {
    const trimmed = input.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput('');
  }

  return (
    <div className="space-y-1.5">
      {value.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex-1 px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-800 truncate">
            {opt}
          </span>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="text-gray-400 hover:text-red-500 text-lg leading-none px-1 flex-shrink-0"
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Type an option and press + or Enter"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex-shrink-0"
        >
          +
        </button>
      </div>
    </div>
  );
}


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

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading, mutate } = useSWR(`${API}/jobs/${id}`, fetcher);
  const job: any = data?.data;

  const { data: screeningData, mutate: mutateScreening } = useSWR(
    `${API}/jobs/${id}/screening`,
    fetcher
  );
  const questions: any[] = screeningData?.data?.questions ?? [];

  const { confirm, confirmModal } = useConfirmModal();

  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [addForm, setAddForm] = useState<QuestionForm>(DEFAULT_QUESTION);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<QuestionForm>(DEFAULT_QUESTION);


  function parseOptions(csv: string): string[] | null {
    const arr = csv.split(',').map((s) => s.trim()).filter(Boolean);
    return arr.length > 0 ? arr : null;
  }

  function questionPayload(f: QuestionForm) {
    return {
      question: f.question.trim(),
      type: f.type,
      isRequired: f.isRequired,
      isKnockout: f.isKnockout,
      options: CHOICE_TYPES.includes(f.type) && f.options.length > 0 ? f.options : null,
      knockoutAnswers: f.isKnockout ? parseOptions(f.knockoutAnswers) : null,
      helpText: f.helpText.trim() || null,
    };
  }

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.question.trim()) { toast.error('Question text is required.'); return; }
    const toastId = toast.loading('Adding question…');
    try {
      await apiCall(`${API}/jobs/${id}/screening/questions`, questionPayload(addForm));
      toast.success('Question added.', { id: toastId });
      setAddForm(DEFAULT_QUESTION);
      setShowAddQuestion(false);
      mutateScreening();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add question.', { id: toastId });
    }
  }

  function startEditQuestion(q: any) {
    setEditingQuestionId(q.id);
    setEditingForm({
      question: q.question,
      type: q.type,
      isRequired: q.isRequired,
      isKnockout: q.isKnockout,
      options: q.options ?? [],
      knockoutAnswers: (q.knockoutAnswers ?? []).join(', '),
      helpText: q.helpText ?? '',
    });
  }

  async function saveQuestion(questionId: string) {
    if (!editingForm.question.trim()) { toast.error('Question text is required.'); return; }
    const toastId = toast.loading('Saving question…');
    try {
      await apiCall(
        `${API}/jobs/${id}/screening/questions/${questionId}`,
        questionPayload(editingForm),
        'PATCH'
      );
      toast.success('Question updated.', { id: toastId });
      setEditingQuestionId(null);
      mutateScreening();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update question.', { id: toastId });
    }
  }

  async function deleteQuestion(questionId: string, questionText: string) {
    const ok = await confirm({
      title: 'Remove question?',
      description: `"${questionText.slice(0, 80)}${questionText.length > 80 ? '…' : ''}" will be permanently removed.`,
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    const toastId = toast.loading('Removing question…');
    try {
      await apiCall(`${API}/jobs/${id}/screening/questions/${questionId}`, undefined, 'DELETE');
      toast.success('Question removed.', { id: toastId });
      mutateScreening();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to remove question.', { id: toastId });
    }
  }

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
        if (newId) router.push(`/portal/jobs/${newId}`);
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
        <Link href="/portal/jobs" className="mt-3 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <ArrowLeft size={14} /> Back to Jobs
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
              <Link
                href="/portal/jobs"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft size={13} /> Jobs
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

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {status !== JobStatus.ARCHIVED && (
              <Link
                href={`/portal/jobs/${id}/edit`}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Edit
              </Link>
            )}

            <button
              onClick={() => runAction('duplicate')}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Duplicate
            </button>

            {status === JobStatus.DRAFT && (
              <button
                onClick={() => runAction('publish')}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Publish
              </button>
            )}

            {status === JobStatus.PUBLISHED && (
              <button
                onClick={() => runAction('pause')}
                className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600"
              >
                Pause
              </button>
            )}

            {status === JobStatus.PAUSED && (
              <button
                onClick={() => runAction('reopen')}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Reopen
              </button>
            )}

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Section title="Role Details">
              <div className="space-y-3">
                <InfoRow label="Department" value={job.department} />
                <InfoRow
                  label="Level"
                  value={LEVEL_LABELS[job.level as ExperienceLevel] ?? job.level}
                />
                <InfoRow
                  label="Employment type"
                  value={TYPE_LABELS[job.employmentType as EmploymentType] ?? job.employmentType}
                />
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

            <Section title="Job Description">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {job.description}
              </p>
            </Section>

            {(() => {
              const isReadOnly = status === JobStatus.CLOSED || status === JobStatus.ARCHIVED;
              return (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        Screening Questions{questions.length > 0 ? ` (${questions.length})` : ''}
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Shown to candidates before they apply
                      </p>
                    </div>
                    {!isReadOnly && (
                      <button
                        onClick={() => {
                          setShowAddQuestion((v) => !v);
                          setAddForm(DEFAULT_QUESTION);
                        }}
                        className={clsx(
                          'px-3 py-1.5 text-sm rounded-lg font-medium transition-colors',
                          showAddQuestion
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        )}
                      >
                        {showAddQuestion ? 'Cancel' : '+ Add Question'}
                      </button>
                    )}
                  </div>

                  {questions.length === 0 && !showAddQuestion ? (
                    <p className="px-5 py-8 text-center text-sm text-gray-400">
                      No screening questions yet.
                    </p>
                  ) : (
                    questions.length > 0 && (
                      <ul className="divide-y divide-gray-50">
                        {questions.map((q: any) => {
                          const isEditing = editingQuestionId === q.id;
                          return (
                            <li
                              key={q.id}
                              className={clsx('px-5 py-4', isEditing && 'bg-indigo-50/40')}
                            >
                              {isEditing ? (
                                <div className="space-y-3">
                                  <textarea
                                    rows={2}
                                    className={inputCls}
                                    value={editingForm.question}
                                    onChange={(e) =>
                                      setEditingForm((f) => ({ ...f, question: e.target.value }))
                                    }
                                    placeholder="Question text"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <select
                                      className={inputCls}
                                      value={editingForm.type}
                                      onChange={(e) =>
                                        setEditingForm((f) => ({
                                          ...f,
                                          type: e.target.value as QuestionType,
                                        }))
                                      }
                                    >
                                      {Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => (
                                        <option key={v} value={v}>
                                          {l}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      className={inputCls}
                                      placeholder="Help text (optional)"
                                      value={editingForm.helpText}
                                      onChange={(e) =>
                                        setEditingForm((f) => ({ ...f, helpText: e.target.value }))
                                      }
                                    />
                                  </div>
                                  {CHOICE_TYPES.includes(editingForm.type) && (
                                    <OptionsEditor
                                      value={editingForm.options}
                                      onChange={(v) =>
                                        setEditingForm((f) => ({ ...f, options: v }))
                                      }
                                    />
                                  )}
                                  <div className="flex items-center gap-4 flex-wrap">
                                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={editingForm.isRequired}
                                        onChange={(e) =>
                                          setEditingForm((f) => ({
                                            ...f,
                                            isRequired: e.target.checked,
                                          }))
                                        }
                                        className="rounded"
                                      />
                                      Required
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={editingForm.isKnockout}
                                        onChange={(e) =>
                                          setEditingForm((f) => ({
                                            ...f,
                                            isKnockout: e.target.checked,
                                          }))
                                        }
                                        className="rounded"
                                      />
                                      Knockout
                                    </label>
                                    {editingForm.isKnockout && (
                                      <textarea
                                        rows={2}
                                        className={inputCls}
                                        placeholder="Knockout answer(s) (comma-separated)"
                                        value={editingForm.knockoutAnswers}
                                        onChange={(e) =>
                                          setEditingForm((f) => ({
                                            ...f,
                                            knockoutAnswers: e.target.value,
                                          }))
                                        }
                                      />
                                    )}
                                    <div className="ml-auto flex gap-2">
                                      <button
                                        onClick={() => setEditingQuestionId(null)}
                                        className="text-xs text-gray-400 hover:text-gray-600"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => saveQuestion(q.id)}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800">{q.question}</p>
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                                        {QUESTION_TYPE_LABELS[q.type as QuestionType]}
                                      </span>
                                      {q.isRequired && (
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                                          Required
                                        </span>
                                      )}
                                      {q.isKnockout && (
                                        <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs">
                                          Knockout
                                        </span>
                                      )}
                                      {q.isKnockout && q.knockoutAnswers?.length > 0 && (
                                        <span className="text-xs text-gray-400">
                                          {q.knockoutAnswers.join(', ')}
                                        </span>
                                      )}
                                      {q.options?.length > 0 && (
                                        <span className="text-xs text-gray-400">
                                          {q.options.join(', ')}
                                        </span>
                                      )}
                                      {q.helpText && (
                                        <span className="text-xs text-gray-400 italic">
                                          {q.helpText}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {!isReadOnly && (
                                    <div className="flex gap-3 flex-shrink-0">
                                      <button
                                        onClick={() => startEditQuestion(q)}
                                        className="text-xs text-indigo-500 hover:text-indigo-700"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => deleteQuestion(q.id, q.question)}
                                        className="text-xs text-red-400 hover:text-red-600"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )
                  )}

                  {showAddQuestion && (
                    <form
                      onSubmit={addQuestion}
                      className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-3"
                    >
                      <h4 className="text-xs font-semibold text-gray-700">New Question</h4>
                      <textarea
                        required
                        rows={2}
                        className={inputCls}
                        placeholder="e.g. Do you have valid work authorization in Sri Lanka?"
                        value={addForm.question}
                        onChange={(e) => setAddForm((f) => ({ ...f, question: e.target.value }))}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className={inputCls}
                          value={addForm.type}
                          onChange={(e) =>
                            setAddForm((f) => ({ ...f, type: e.target.value as QuestionType }))
                          }
                        >
                          {Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                        <input
                          className={inputCls}
                          placeholder="Help text (optional)"
                          value={addForm.helpText}
                          onChange={(e) => setAddForm((f) => ({ ...f, helpText: e.target.value }))}
                        />
                      </div>
                      {CHOICE_TYPES.includes(addForm.type) && (
                        <OptionsEditor
                          value={addForm.options}
                          onChange={(v) => setAddForm((f) => ({ ...f, options: v }))}
                        />
                      )}
                      <div className="flex items-center gap-4 flex-wrap">
                        <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addForm.isRequired}
                            onChange={(e) =>
                              setAddForm((f) => ({ ...f, isRequired: e.target.checked }))
                            }
                            className="rounded"
                          />
                          Required
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addForm.isKnockout}
                            onChange={(e) =>
                              setAddForm((f) => ({ ...f, isKnockout: e.target.checked }))
                            }
                            className="rounded"
                          />
                          Knockout
                        </label>
                        {addForm.isKnockout && (
                          <input
                            className={clsx(inputCls, 'w-56')}
                            placeholder="Knockout answer(s) (comma-separated)"
                            value={addForm.knockoutAnswers}
                            onChange={(e) =>
                              setAddForm((f) => ({ ...f, knockoutAnswers: e.target.value }))
                            }
                          />
                        )}
                        <button
                          type="submit"
                          className="ml-auto px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                        >
                          Add
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="space-y-6">
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

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Scoring Configuration</h2>
                <Link
                  href={`/portal/jobs/${id}/scoring`}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                   {job.hasScoringConfig ? 'Update' : 'Configure'}
                </Link>
              </div>
              {job.hasScoringConfig ? (
                <div className="space-y-2">
                  <InfoRow
                    label="Shortlist threshold"
                    value={`${job.scoringConfig.shortlistThreshold}%`}
                  />
                  <InfoRow label="Pass threshold" value={`${job.scoringConfig.passThreshold}%`} />
                  <InfoRow label="Dimensions" value={job.scoringConfig.dimensionCount} />
                  <InfoRow label="Knockout rules" value={job.scoringConfig.knockoutRuleCount} />
                  <InfoRow
                    label="Weight balanced"
                    value={job.scoringConfig.isWeightBalanced ? 'Yes' : 'No'}
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-400">No scoring config</p>
              )}
            </div>

            <Section title="Metadata">
              <div className="space-y-2">
                <InfoRow label="Created by" value={job.createdBy?.fullName ?? '—'} />
                <InfoRow label="Created" value={new Date(job.createdAt).toLocaleDateString()} />
                <InfoRow label="Updated" value={new Date(job.updatedAt).toLocaleDateString()} />
                {job.slug && <InfoRow label="Slug" value={job.slug} />}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </>
  );
}
