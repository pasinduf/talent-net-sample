'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import {
  EmploymentType,
  ExperienceLevel,
  InterviewType,
  JobStatus,
} from '@talent-net/types';
import { useConfirmModal } from '@/components/ui/ConfirmModal';
import { API, authHeaders, fetcher } from '@/lib/api';


const DEPARTMENTS = [
  'Engineering', 'Design', 'Data & Analytics', 'Infrastructure', 'Marketing',
  'Human Resources', 'Finance', 'Sales', 'Operations', 'Legal', 'Product',
];

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

const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  [InterviewType.TAKE_HOME]: 'Take-home Assignment',
  [InterviewType.AI]: 'AI Interview',
  [InterviewType.MANUAL]: 'Manual Interview',
  [InterviewType.HYBRID]: 'Hybrid (AI + Manual)',
};

interface JobForm {
  title: string;
  department: string;
  level: ExperienceLevel | '';
  employmentType: EmploymentType | '';
  headcount: string;
  location: string;
  isRemote: boolean;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  applicationDeadline: string;
  interviewTypes: InterviewType[];
  description: string;
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500';


function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="ml-1.5 font-normal text-gray-400">({hint})</span>}
      </label>
      {children}
    </div>
  );
}


export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading } = useSWR(`${API}/jobs/${id}`, fetcher);
  const job: any = data?.data;

  const [form, setForm] = useState<JobForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { confirm, confirmModal } = useConfirmModal();
  const today = new Date().toISOString().split('T')[0];
 
  useEffect(() => {
    if (!job) return;
    setForm({
      title: job.title ?? '',
      department: job.department ?? '',
      level: (job.level as ExperienceLevel) ?? '',
      employmentType: (job.employmentType as EmploymentType) ?? '',
      headcount: job.headcount != null ? String(job.headcount) : '',
      location: job.location ?? '',
      isRemote: job.isRemote ?? false,
      salaryMin: job.salaryMin != null ? String(job.salaryMin) : '',
      salaryMax: job.salaryMax != null ? String(job.salaryMax) : '',
      salaryCurrency: job.salaryCurrency ?? 'LKR',
      applicationDeadline: job.applicationDeadline
        ? new Date(job.applicationDeadline).toISOString().slice(0, 10)
        : '',
      interviewTypes: job.interviewTypes ?? [],
      description: job.description ?? '',
    });
  }, [job]);

  function set<K extends keyof JobForm>(k: K, v: JobForm[K]) {
    setForm((f) => (f ? { ...f, [k]: v } : f));
  }

  function toggleInterviewType(t: InterviewType) {
    if (!form) return;
    const arr = form.interviewTypes.includes(t)
      ? form.interviewTypes.filter((x) => x !== t)
      : [...form.interviewTypes, t];
    set('interviewTypes', arr);
  }

  function validate(): string {
    if (!form) return '';
    if (!form.title.trim()) return 'Job title is required.';
    if (!form.department) return 'Department is required.';
    if (!form.level) return 'Experience level is required.';
    if (!form.employmentType) return 'Employment type is required.';
    if (!form.location.trim()) return 'Location is required.';
    if (form.interviewTypes.length === 0) return 'Select at least one interview stage.';
    return '';
  }

  async function save() {
    const err = validate();
    if (err) { setError(err); return; }
    if (!form) return;

    setSaving(true);
    setError('');
    const toastId = toast.loading('Saving changes...');

    try {
      const res = await fetch(`${API}/jobs/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          title: form.title.trim(),
          department: form.department,
          level: form.level || undefined,
          employmentType: form.employmentType || undefined,
          location: form.location.trim(),
          isRemote: form.isRemote,
          headcount: form.headcount ? Number(form.headcount) : null,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
          salaryCurrency: form.salaryCurrency || undefined,
          applicationDeadline: form.applicationDeadline
            ? new Date(form.applicationDeadline).toISOString()
            : null,
          interviewTypes: form.interviewTypes,
          description: form.description,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.error?.message ?? `Server error ${res.status}`);
      }

      toast.success('Job updated successfully!', { id: toastId });
      router.push(`/portal/jobs/${id}`);
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to save changes.';
      toast.error(msg, { id: toastId });
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !form) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-sm text-gray-500">Loading job...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Job not found.</p>
        <Link href="/portal/jobs" className="mt-3 text-sm text-indigo-600 hover:underline">
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  const isReadOnly =
    job.status === JobStatus.CLOSED || job.status === JobStatus.ARCHIVED;


  return (
    <>
    {confirmModal}
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/portal/jobs/${id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← {job.title}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Edit Job</h1>
      </div>

      {isReadOnly && (
        <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
          This job is <strong>{job.status}</strong> and cannot be edited.
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <Section title="Basic Information">
        <Field label="Job Title" required>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            disabled={isReadOnly}
            placeholder="e.g. Senior Frontend Engineer"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Department" required>
            <select
              value={form.department}
              onChange={(e) => set('department', e.target.value)}
              disabled={isReadOnly}
              className={inputCls}
            >
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>

          <Field label="Experience Level" required>
            <select
              value={form.level}
              onChange={(e) => set('level', e.target.value as ExperienceLevel)}
              disabled={isReadOnly}
              className={inputCls}
            >
              <option value="">Select level</option>
              {Object.entries(LEVEL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>

          <Field label="Employment Type" required>
            <select
              value={form.employmentType}
              onChange={(e) => set('employmentType', e.target.value as EmploymentType)}
              disabled={isReadOnly}
              className={inputCls}
            >
              <option value="">Select type</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>

          <Field label="Headcount" hint="Number of openings">
            <input
              type="number"
              min="1"
              value={form.headcount}
              onChange={(e) => set('headcount', e.target.value)}
              disabled={isReadOnly}
              placeholder="1"
              className={inputCls}
            />
          </Field>

          <Field label="Application Deadline">
            <input
              type="date"
              value={form.applicationDeadline}
              onChange={(e) => set('applicationDeadline', e.target.value)}
              disabled={isReadOnly}
              min={today}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      <Section title="Location">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Office Location" required>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              disabled={isReadOnly}
              placeholder="e.g. Colombo"
              className={inputCls}
            />
          </Field>
        </div>
        <label className="flex items-center gap-3 cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={form.isRemote}
            onChange={(e) => set('isRemote', e.target.checked)}
            disabled={isReadOnly}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">Remote-friendly position</span>
        </label>
      </Section>

      <Section title="Salary Range" subtitle="Optional — leave blank to hide from the careers portal">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Currency">
            <select
              value={form.salaryCurrency}
              onChange={(e) => set('salaryCurrency', e.target.value)}
              disabled={isReadOnly}
              className={inputCls}
            >
              {['LKR', 'USD', 'SGD', 'EUR', 'GBP', 'THB'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Minimum">
            <input
              type="number"
              min="0"
              value={form.salaryMin}
              onChange={(e) => set('salaryMin', e.target.value)}
              disabled={isReadOnly}
              placeholder="e.g. 80000"
              className={inputCls}
            />
          </Field>
          <Field label="Maximum">
            <input
              type="number"
              min="0"
              value={form.salaryMax}
              onChange={(e) => set('salaryMax', e.target.value)}
              disabled={isReadOnly}
              placeholder="e.g. 120000"
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      <Section title="Interview Stages" subtitle="Select the stages that will be part of this hiring process">
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
          {Object.values(InterviewType).map((v) => {
            const checked = form.interviewTypes.includes(v);
            return (
              <button
                key={v}
                type="button"
                disabled={isReadOnly}
                onClick={() => toggleInterviewType(v)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-colors select-none text-left',
                  checked
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                  isReadOnly && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span
                  className={clsx(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                    checked ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white'
                  )}
                >
                  {checked && (
                    <span className="text-white text-[10px] font-bold leading-none">✓</span>
                  )}
                </span>
                {INTERVIEW_TYPE_LABELS[v]}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Job Description" subtitle="HTML is supported: h2, ul, li, p, strong, em">
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          disabled={isReadOnly}
          rows={14}
          placeholder={`<h2>About the Role</h2>\n<p>We are looking for...</p>`}
          className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y disabled:bg-gray-50"
        />
      </Section>

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6 pb-10">
        <Link
          href={`/portal/jobs/${id}`}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </Link>
        {!isReadOnly && (
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </div>
    </div>
    </>
  );
}
