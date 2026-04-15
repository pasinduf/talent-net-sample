'use client';

/**
 * /admin/jobs/new — Multi-step Create Job wizard
 *
 * Step 1 – Role Details      (title, description, type, level, location, salary, deadline, headcount, interview stages)
 * Step 2 – Application Form  (screening questions per QuestionType)
 * Step 3 – Scoring Config    (phase weights, thresholds, evaluation dimensions, knockout rules)
 * Step 4 – Review & Publish  (summary + save draft / publish)
 *
 * On "Save as Draft" / "Publish":
 *   1. POST /jobs               → creates the job (returns id)
 *   2. POST /jobs/:id/screening  → bulk-creates screening questions (if any)
 *   3. POST /jobs/:id/scoring    → creates scoring config with dimensions + knockout rules (if any)
 *   4. POST /jobs/:id/publish    → only when "Publish Now" is chosen
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import {
  EmploymentType,
  ExperienceLevel,
  InterviewType,
  QuestionType,
  DimensionType,
  EvaluationPhase,
  KnockoutCondition,
  KnockoutAction,
} from '@talent-net/types';

// ─── Constants & Labels ──────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tn_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  } as Record<string, string>;
}

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

const PHASE_LABELS: Record<EvaluationPhase, string> = {
  [EvaluationPhase.PRE_INTERVIEW]: 'Pre-Interview',
  [EvaluationPhase.POST_INTERVIEW]: 'Post-Interview',
  [EvaluationPhase.BOTH]: 'Both Phases',
};

const DIM_TYPE_LABELS: Record<DimensionType, string> = {
  [DimensionType.MANDATORY]: 'Mandatory',
  [DimensionType.OPTIONAL]: 'Optional',
  [DimensionType.ADVISORY]: 'Advisory',
  [DimensionType.DISQUALIFYING]: 'Disqualifying',
};

const DIM_TYPE_HELP: Record<DimensionType, string> = {
  [DimensionType.MANDATORY]: 'Must be scored; contributes to total',
  [DimensionType.OPTIONAL]: 'Scored if possible; contributes to total',
  [DimensionType.ADVISORY]: 'Informational only; does not affect total score',
  [DimensionType.DISQUALIFYING]: 'Failing this dimension flags the candidate for non-progression',
};

const KNOCKOUT_CONDITION_LABELS: Record<KnockoutCondition, string> = {
  [KnockoutCondition.CERTIFICATION_REQUIRED]: 'Certification Required',
  [KnockoutCondition.WORK_AUTHORIZATION]: 'Work Authorization',
  [KnockoutCondition.LANGUAGE_REQUIREMENT]: 'Language Requirement',
  [KnockoutCondition.AVAILABILITY_REQUIREMENT]: 'Availability Requirement',
  [KnockoutCondition.MINIMUM_EDUCATION]: 'Minimum Education',
  [KnockoutCondition.MINIMUM_EXPERIENCE_YEARS]: 'Minimum Years of Experience',
  [KnockoutCondition.LOCATION_REQUIREMENT]: 'Location Requirement',
  [KnockoutCondition.CUSTOM]: 'Custom Rule',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScreeningQuestionDraft {
  _id: string; // local only
  question: string;
  type: QuestionType;
  isRequired: boolean;
  isKnockout: boolean;
  options: string; // comma-separated for choice types
  helpText: string;
}

interface DimensionDraft {
  _id: string;
  name: string;
  description: string;
  weight: string;
  type: DimensionType;
  phase: EvaluationPhase;
  minimumThreshold: string;
  isVisibleToAllReviewers: boolean;
}

interface KnockoutRuleDraft {
  _id: string;
  name: string;
  description: string;
  condition: KnockoutCondition;
  conditionValue: string;
  action: KnockoutAction;
  errorMessage: string;
}

// ─── Step 1: Role Details ─────────────────────────────────────────────────────

interface RoleForm {
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

const ROLE_INIT: RoleForm = {
  title: '', department: '', level: '', employmentType: '',
  headcount: '', location: '', isRemote: false,
  salaryMin: '', salaryMax: '', salaryCurrency: 'THB',
  applicationDeadline: '', interviewTypes: [], description: '',
};

// ─── Step 3: Scoring Config ───────────────────────────────────────────────────

interface ScoringForm {
  preInterviewWeight: string;
  postInterviewWeight: string;
  shortlistThreshold: string;
  passThreshold: string;
  manualReviewThreshold: string;
}

const SCORING_INIT: ScoringForm = {
  preInterviewWeight: '60',
  postInterviewWeight: '40',
  shortlistThreshold: '75',
  passThreshold: '60',
  manualReviewThreshold: '40',
};

// ─── Stepper ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Role Details' },
  { id: 2, label: 'Application Form' },
  { id: 3, label: 'Scoring' },
  { id: 4, label: 'Review & Publish' },
];

function uid() {
  return Math.random().toString(36).slice(2);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewJobPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState<RoleForm>(ROLE_INIT);
  const [questions, setQuestions] = useState<ScreeningQuestionDraft[]>([]);
  const [scoring, setScoring] = useState<ScoringForm>(SCORING_INIT);
  const [dimensions, setDimensions] = useState<DimensionDraft[]>([]);
  const [knockouts, setKnockouts] = useState<KnockoutRuleDraft[]>([]);

  const [stepError, setStepError] = useState('');
  const [saving, setSaving] = useState(false);

  // ── validation ──────────────────────────────────────────────────────────────

  function validateStep1(): string {
    if (!role.title.trim()) return 'Job title is required.';
    if (!role.department) return 'Department is required.';
    if (!role.level) return 'Experience level is required.';
    if (!role.employmentType) return 'Employment type is required.';
    if (!role.location.trim()) return 'Location is required.';
    return '';
  }

  function validateStep3(): string {
    const pre = Number(scoring.preInterviewWeight);
    const post = Number(scoring.postInterviewWeight);
    if (Math.abs(pre + post - 100) > 0.01) {
      return 'Pre-interview and post-interview weights must sum to 100%.';
    }
    const totalDimWeight = dimensions.reduce((s, d) => s + (parseFloat(d.weight) || 0), 0);
    if (dimensions.length > 0 && Math.abs(totalDimWeight - 100) > 0.01) {
      return `Dimension weights sum to ${totalDimWeight.toFixed(1)}%. They must total 100%.`;
    }
    return '';
  }

  function goNext() {
    let err = '';
    if (step === 1) err = validateStep1();
    if (step === 3) err = validateStep3();
    if (err) { setStepError(err); return; }
    setStepError('');
    setStep((s) => s + 1);
  }

  function goBack() {
    setStepError('');
    setStep((s) => s - 1);
  }

  // ── submission ──────────────────────────────────────────────────────────────

  async function submit(publish: boolean) {
    const err1 = validateStep1();
    if (err1) { setStep(1); setStepError(err1); return; }
    const err3 = validateStep3();
    if (err3) { setStep(3); setStepError(err3); return; }

    setSaving(true);
    setStepError('');

    const toastId = toast.loading('Creating job...');

    try {
      // 1. Create job
      const jobRes = await fetch(`${API}/jobs`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: role.title.trim(),
          department: role.department,
          level: role.level,
          employmentType: role.employmentType,
          location: role.location.trim(),
          isRemote: role.isRemote,
          headcount: role.headcount ? Number(role.headcount) : undefined,
          salaryMin: role.salaryMin ? Number(role.salaryMin) : null,
          salaryMax: role.salaryMax ? Number(role.salaryMax) : null,
          salaryCurrency: role.salaryCurrency || null,
          applicationDeadline: role.applicationDeadline || null,
          interviewTypes: role.interviewTypes,
          description: role.description,
        }),
      });
      if (!jobRes.ok) {
        const body = await jobRes.json().catch(() => ({}));
        throw new Error((body as any)?.error?.message ?? `Server error ${jobRes.status}`);
      }
      const jobData = await jobRes.json();
      const jobId: string = jobData?.data?.id;
      if (!jobId) throw new Error('Job created but no ID returned.');

      // 2. Create screening questions (if any)
      if (questions.length > 0) {
        toast.loading(`Saving ${questions.length} screening question(s)...`, { id: toastId });
        const questionsPayload = questions.map((q, i) => ({
          question: q.question,
          type: q.type,
          isRequired: q.isRequired,
          isKnockout: q.isKnockout,
          options: [QuestionType.SINGLE_CHOICE, QuestionType.MULTI_CHOICE].includes(q.type)
            ? q.options.split(',').map((o) => o.trim()).filter(Boolean)
            : undefined,
          helpText: q.helpText || undefined,
          order: i,
        }));
        const screeningRes = await fetch(`${API}/jobs/${jobId}/screening`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ questions: questionsPayload }),
        });
        if (!screeningRes.ok) {
          const body = await screeningRes.json().catch(() => ({}));
          throw new Error((body as any)?.error?.message ?? `Failed to save screening questions (${screeningRes.status})`);
        }
      }

      // 3. Create scoring config (always, even without dimensions)
      toast.loading('Saving scoring configuration...', { id: toastId });
      const scoringPayload = {
        totalScaleMax: 100,
        preInterviewWeight: Number(scoring.preInterviewWeight),
        postInterviewWeight: Number(scoring.postInterviewWeight),
        shortlistThreshold: Number(scoring.shortlistThreshold),
        passThreshold: Number(scoring.passThreshold),
        manualReviewThreshold: Number(scoring.manualReviewThreshold),
        evaluationDimensions: dimensions.map((d, i) => ({
          name: d.name,
          description: d.description || undefined,
          weight: parseFloat(d.weight),
          type: d.type,
          phase: d.phase,
          minimumThreshold: d.minimumThreshold ? Number(d.minimumThreshold) : undefined,
          isVisibleToAllReviewers: d.isVisibleToAllReviewers,
          order: i,
        })),
        knockoutRules: knockouts.map((k) => ({
          name: k.name,
          description: k.description || undefined,
          condition: k.condition,
          conditionValue: k.conditionValue,
          action: k.action,
          errorMessage: k.errorMessage,
        })),
      };
      const scoringRes = await fetch(`${API}/jobs/${jobId}/scoring`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(scoringPayload),
      });
      if (!scoringRes.ok) {
        const body = await scoringRes.json().catch(() => ({}));
        throw new Error((body as any)?.error?.message ?? `Failed to save scoring config (${scoringRes.status})`);
      }

      // 4. Publish if requested
      if (publish) {
        toast.loading('Publishing job...', { id: toastId });
        const publishRes = await fetch(`${API}/jobs/${jobId}/publish`, {
          method: 'POST',
          headers: authHeaders(),
        });
        if (!publishRes.ok) {
          const body = await publishRes.json().catch(() => ({}));
          throw new Error((body as any)?.error?.message ?? `Failed to publish job (${publishRes.status})`);
        }
      }

      toast.success(publish ? 'Job published successfully!' : 'Job saved as draft!', { id: toastId });
      router.push(`/admin/jobs/${jobId}`);
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to save. Please try again.';
      toast.error(msg, { id: toastId });
      setStepError(msg);
    } finally {
      setSaving(false);
    }
  }

  // ── rendering ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/jobs" className="text-sm text-gray-500 hover:text-gray-700">← Jobs</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">New Job</h1>
      </div>

      {/* Stepper */}
      <StepIndicator current={step} />

      {stepError && (
        <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {stepError}
        </div>
      )}

      <div className="mt-6">
        {step === 1 && <StepRoleDetails form={role} onChange={setRole} />}
        {step === 2 && <StepApplicationForm questions={questions} onChange={setQuestions} />}
        {step === 3 && (
          <StepScoringConfig
            scoring={scoring}
            onScoringChange={setScoring}
            dimensions={dimensions}
            onDimensionsChange={setDimensions}
            knockouts={knockouts}
            onKnockoutsChange={setKnockouts}
          />
        )}
        {step === 4 && (
          <StepReview
            role={role}
            questions={questions}
            scoring={scoring}
            dimensions={dimensions}
            knockouts={knockouts}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6 pb-10">
        <div>
          {step > 1 && (
            <button
              onClick={goBack}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              Back
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {step < 4 && (
            <button
              onClick={goNext}
              className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Continue
            </button>
          )}
          {step === 4 && (
            <>
              <button
                disabled={saving}
                onClick={() => submit(false)}
                className="px-5 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>
              <button
                disabled={saving}
                onClick={() => submit(true)}
                className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Publishing…' : 'Publish Now'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <nav className="flex items-center gap-0">
      {STEPS.map((s, i) => {
        const done = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                  done && 'bg-indigo-600 border-indigo-600 text-white',
                  active && 'bg-white border-indigo-600 text-indigo-600',
                  !done && !active && 'bg-white border-gray-300 text-gray-400',
                )}
              >
                {done ? '✓' : s.id}
              </div>
              <span
                className={clsx(
                  'text-sm font-medium',
                  active ? 'text-indigo-700' : done ? 'text-gray-600' : 'text-gray-400',
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx('w-10 h-0.5 mx-2', s.id < current ? 'bg-indigo-600' : 'bg-gray-200')} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ─── Step 1: Role Details ─────────────────────────────────────────────────────

function StepRoleDetails({ form, onChange }: { form: RoleForm; onChange: (f: RoleForm) => void }) {
  function set<K extends keyof RoleForm>(k: K, v: RoleForm[K]) {
    onChange({ ...form, [k]: v });
  }

  function toggleInterviewType(t: InterviewType) {
    const arr = form.interviewTypes.includes(t)
      ? form.interviewTypes.filter((x) => x !== t)
      : [...form.interviewTypes, t];
    set('interviewTypes', arr);
  }

  return (
    <div className="space-y-6">
      {/* Basic */}
      <Section title="Basic Information">
        <Field label="Job Title" required>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Department" required>
            <select value={form.department} onChange={(e) => set('department', e.target.value)} className={inputCls}>
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>

          <Field label="Experience Level" required>
            <select value={form.level} onChange={(e) => set('level', e.target.value as ExperienceLevel)} className={inputCls}>
              <option value="">Select level</option>
              {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>

          <Field label="Employment Type" required>
            <select value={form.employmentType} onChange={(e) => set('employmentType', e.target.value as EmploymentType)} className={inputCls}>
              <option value="">Select type</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>

          <Field label="Headcount" hint="Number of openings">
            <input
              type="number"
              min="1"
              value={form.headcount}
              onChange={(e) => set('headcount', e.target.value)}
              placeholder="1"
              className={inputCls}
            />
          </Field>

          <Field label="Application Deadline">
            <input
              type="date"
              value={form.applicationDeadline}
              onChange={(e) => set('applicationDeadline', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* Location */}
      <Section title="Location">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Office Location" required>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
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
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">Remote-friendly position</span>
        </label>
      </Section>

      {/* Salary */}
      <Section title="Salary Range" subtitle="Optional — leave blank to hide from the careers portal">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Currency">
            <select value={form.salaryCurrency} onChange={(e) => set('salaryCurrency', e.target.value)} className={inputCls}>
              {['LKR', 'USD', 'SGD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Minimum">
            <input type="number" min="0" value={form.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} placeholder="e.g. 80000" className={inputCls} />
          </Field>
          <Field label="Maximum">
            <input type="number" min="0" value={form.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} placeholder="e.g. 120000" className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* Interview stages */}
      <Section title="Interview Stages" subtitle="Select the stages that will be part of this hiring process">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.values(InterviewType)).map((v) => {
            const checked = form.interviewTypes.includes(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggleInterviewType(v)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-colors select-none text-left',
                  checked
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                <span className={clsx('w-4 h-4 rounded border flex items-center justify-center flex-shrink-0', checked ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white')}>
                  {checked && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                </span>
                {INTERVIEW_TYPE_LABELS[v]}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Description */}
      <Section title="Job Description" subtitle="HTML is supported: h2, ul, li, p, strong, em">
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={14}
          placeholder={`<h2>About the Role</h2>\n<p>We are looking for...</p>\n\n<h2>Responsibilities</h2>\n<ul>\n  <li>...</li>\n</ul>\n\n<h2>Requirements</h2>\n<ul>\n  <li>...</li>\n</ul>`}
          className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
        />
      </Section>
    </div>
  );
}

// ─── Step 2: Application Form ─────────────────────────────────────────────────

const CHOICE_TYPES = new Set<QuestionType>([QuestionType.SINGLE_CHOICE, QuestionType.MULTI_CHOICE]);

const BLANK_QUESTION = (): ScreeningQuestionDraft => ({
  _id: uid(), question: '', type: QuestionType.TEXT,
  isRequired: true, isKnockout: false, options: '', helpText: '',
});

function StepApplicationForm({
  questions,
  onChange,
}: {
  questions: ScreeningQuestionDraft[];
  onChange: (q: ScreeningQuestionDraft[]) => void;
}) {
  const [draft, setDraft] = useState<ScreeningQuestionDraft>(BLANK_QUESTION);

  function updateDraft<K extends keyof ScreeningQuestionDraft>(k: K, v: ScreeningQuestionDraft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function addQuestion() {
    if (!draft.question.trim()) return;
    onChange([...questions, { ...draft, _id: uid() }]);
    setDraft(BLANK_QUESTION());
  }

  function removeQuestion(id: string) {
    onChange(questions.filter((q) => q._id !== id));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const arr = [...questions];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    onChange(arr);
  }

  function moveDown(idx: number) {
    if (idx === questions.length - 1) return;
    const arr = [...questions];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    onChange(arr);
  }

  return (
    <div className="space-y-6">
      <Section
        title="Screening Questions"
        subtitle="Applicants will answer these when submitting their application. Knockout questions automatically flag mismatched answers for review."
      >
        {/* Existing questions */}
        {questions.length > 0 && (
          <div className="space-y-2 mb-4">
            {questions.map((q, i) => (
              <div key={q._id} className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 leading-none text-xs">▲</button>
                  <button onClick={() => moveDown(i)} disabled={i === questions.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 leading-none text-xs">▼</button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {i + 1}. {q.question}
                    {q.isRequired && <span className="ml-1 text-red-500 text-xs">*</span>}
                    {q.isKnockout && (
                      <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Knockout</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {QUESTION_TYPE_LABELS[q.type]}
                    {CHOICE_TYPES.has(q.type) && q.options && ` · Options: ${q.options}`}
                    {q.helpText && ` · ${q.helpText}`}
                  </p>
                </div>
                <button onClick={() => removeQuestion(q._id)} className="text-red-400 hover:text-red-600 text-xs flex-shrink-0 mt-0.5">Remove</button>
              </div>
            ))}
          </div>
        )}

        {/* Add question form */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Add Question</p>
          <textarea
            value={draft.question}
            onChange={(e) => updateDraft('question', e.target.value)}
            rows={2}
            placeholder="e.g. Do you have the right to work in Thailand?"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select value={draft.type} onChange={(e) => updateDraft('type', e.target.value as QuestionType)} className={inputCls}>
                {Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {CHOICE_TYPES.has(draft.type) && (
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Options (comma-separated)</label>
                <input
                  type="text"
                  value={draft.options}
                  onChange={(e) => updateDraft('options', e.target.value)}
                  placeholder="Option A, Option B, Option C"
                  className={inputCls}
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Help Text</label>
              <input type="text" value={draft.helpText} onChange={(e) => updateDraft('helpText', e.target.value)} placeholder="Optional hint" className={inputCls} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={draft.isRequired} onChange={(e) => updateDraft('isRequired', e.target.checked)} className="rounded border-gray-300" />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={draft.isKnockout} onChange={(e) => updateDraft('isKnockout', e.target.checked)} className="rounded border-gray-300" />
              <span>Knockout <span className="text-gray-400 text-xs">(wrong answer flags candidate)</span></span>
            </label>
            <button
              type="button"
              onClick={addQuestion}
              disabled={!draft.question.trim()}
              className="ml-auto px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40"
            >
              + Add Question
            </button>
          </div>
        </div>
      </Section>

      <Section title="Required Documents" subtitle="Applicants will be prompted to attach these when submitting.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: 'Resume / CV', note: 'Always required — collected by default' },
            // { label: 'Cover Letter', note: 'Add a screening question of type File Upload to request this.' },
            // { label: 'Portfolio', note: 'Add a screening question with type Short Text or File Upload.' },
            // { label: 'Certificates', note: 'Add a knockout Yes/No question to verify.' },
          ].map((doc) => (
            <div key={doc.label} className="bg-white border border-gray-200 rounded-xl p-3">
              <p className="text-sm font-medium text-gray-800">{doc.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{doc.note}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ─── Step 3: Scoring Configuration ───────────────────────────────────────────

const BLANK_DIM = (): DimensionDraft => ({
  _id: uid(), name: '', description: '', weight: '',
  type: DimensionType.MANDATORY, phase: EvaluationPhase.PRE_INTERVIEW,
  minimumThreshold: '', isVisibleToAllReviewers: true,
});

const BLANK_KNOCKOUT = (): KnockoutRuleDraft => ({
  _id: uid(), name: '', description: '',
  condition: KnockoutCondition.WORK_AUTHORIZATION,
  conditionValue: 'yes',
  action: KnockoutAction.REJECTION_REVIEW,
  errorMessage: '',
});

function StepScoringConfig({
  scoring, onScoringChange,
  dimensions, onDimensionsChange,
  knockouts, onKnockoutsChange,
}: {
  scoring: ScoringForm;
  onScoringChange: (s: ScoringForm) => void;
  dimensions: DimensionDraft[];
  onDimensionsChange: (d: DimensionDraft[]) => void;
  knockouts: KnockoutRuleDraft[];
  onKnockoutsChange: (k: KnockoutRuleDraft[]) => void;
}) {
  const [dimDraft, setDimDraft] = useState<DimensionDraft>(BLANK_DIM);
  const [koDraft, setKoDraft] = useState<KnockoutRuleDraft>(BLANK_KNOCKOUT);

  function setScoringField<K extends keyof ScoringForm>(k: K, v: string) {
    onScoringChange({ ...scoring, [k]: v });
  }

  // Phase weight sync: when pre changes, auto-fill post = 100 - pre
  function setPreWeight(v: string) {
    const n = parseFloat(v);
    onScoringChange({
      ...scoring,
      preInterviewWeight: v,
      postInterviewWeight: isNaN(n) ? scoring.postInterviewWeight : String(Math.max(0, 100 - n)),
    });
  }

  // Dimension weight totals
  const totalWeight = dimensions.reduce((s, d) => s + (parseFloat(d.weight) || 0), 0);
  const weightOk = dimensions.length === 0 || Math.abs(totalWeight - 100) < 0.01;

  function addDimension() {
    if (!dimDraft.name.trim() || !dimDraft.weight) return;
    onDimensionsChange([...dimensions, { ...dimDraft, _id: uid() }]);
    setDimDraft(BLANK_DIM());
  }

  function removeDimension(id: string) {
    onDimensionsChange(dimensions.filter((d) => d._id !== id));
  }

  function addKnockout() {
    if (!koDraft.name.trim() || !koDraft.errorMessage.trim()) return;
    onKnockoutsChange([...knockouts, { ...koDraft, _id: uid() }]);
    setKoDraft(BLANK_KNOCKOUT());
  }

  function removeKnockout(id: string) {
    onKnockoutsChange(knockouts.filter((k) => k._id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Phase weights */}
      <Section
        title="Phase Weighting"
        subtitle="How much of the final score comes from pre-interview vs. post-interview evaluation. Must sum to 100%."
      >
        <div className="grid grid-cols-2 gap-6">
          <Field label="Pre-Interview Weight (%)" required>
            <input
              type="number" min="0" max="100" step="1"
              value={scoring.preInterviewWeight}
              onChange={(e) => setPreWeight(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Post-Interview Weight (%)" required>
            <input
              type="number" min="0" max="100" step="1"
              value={scoring.postInterviewWeight}
              onChange={(e) => setScoringField('postInterviewWeight', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <PhaseBar pre={Number(scoring.preInterviewWeight)} post={Number(scoring.postInterviewWeight)} />
      </Section>

      {/* Thresholds */}
      <Section
        title="Score Thresholds"
        subtitle="Percentage thresholds that determine automatic pipeline routing."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Shortlist Threshold (%)" hint="Candidates at or above this score are auto-shortlisted">
            <input type="number" min="0" max="100" value={scoring.shortlistThreshold} onChange={(e) => setScoringField('shortlistThreshold', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Pass Threshold (%)" hint="Minimum score considered passing">
            <input type="number" min="0" max="100" value={scoring.passThreshold} onChange={(e) => setScoringField('passThreshold', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Manual Review Threshold (%)" hint="Scores below this require human review before any action">
            <input type="number" min="0" max="100" value={scoring.manualReviewThreshold} onChange={(e) => setScoringField('manualReviewThreshold', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="mt-3 text-xs text-gray-400 flex gap-2 flex-wrap">
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">≥ {scoring.shortlistThreshold}% → Auto-shortlist</span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">≥ {scoring.passThreshold}% → Pass</span>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">&lt; {scoring.manualReviewThreshold}% → Manual review</span>
        </div>
      </Section>

      {/* Evaluation Dimensions */}
      <Section
        title="Evaluation Dimensions"
        subtitle="Define what aspects will be scored. Weights within each phase must sum to 100%."
      >
        {/* Weight bar */}
        {dimensions.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Total weight across all dimensions</span>
              <span className={clsx('font-semibold', weightOk ? 'text-green-600' : 'text-red-600')}>
                {totalWeight.toFixed(1)}% / 100%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all', weightOk ? 'bg-green-500' : totalWeight > 100 ? 'bg-red-500' : 'bg-amber-400')}
                style={{ width: `${Math.min(100, totalWeight)}%` }}
              />
            </div>
          </div>
        )}

        {/* Dimensions list */}
        {dimensions.length > 0 && (
          <div className="mb-4 rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5">Dimension</th>
                  <th className="text-left px-3 py-2.5">Phase</th>
                  <th className="text-left px-3 py-2.5">Type</th>
                  <th className="text-right px-3 py-2.5">Weight</th>
                  <th className="text-right px-3 py-2.5">Min Threshold</th>
                  <th className="text-right px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dimensions.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      {d.name}
                      {d.description && <div className="text-xs text-gray-400 font-normal">{d.description}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{PHASE_LABELS[d.phase]}</td>
                    <td className="px-3 py-2.5">
                      <DimTypeBadge type={d.type} />
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-indigo-600">{d.weight}%</td>
                    <td className="px-3 py-2.5 text-right text-gray-500 text-xs">{d.minimumThreshold ? `${d.minimumThreshold}%` : '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => removeDimension(d._id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add dimension form */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Add Dimension</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="col-span-2">
              <input
                value={dimDraft.name}
                onChange={(e) => setDimDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Name (e.g. Technical Skill Match)"
                className={inputCls}
              />
            </div>
            <div>
              <input
                type="number" min="0.1" max="100" step="0.1"
                value={dimDraft.weight}
                onChange={(e) => setDimDraft((d) => ({ ...d, weight: e.target.value }))}
                placeholder="Weight %"
                className={inputCls}
              />
            </div>
            <div>
              <input
                type="number" min="0" max="100" step="1"
                value={dimDraft.minimumThreshold}
                onChange={(e) => setDimDraft((d) => ({ ...d, minimumThreshold: e.target.value }))}
                placeholder="Min threshold %"
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phase</label>
              <select value={dimDraft.phase} onChange={(e) => setDimDraft((d) => ({ ...d, phase: e.target.value as EvaluationPhase }))} className={inputCls}>
                {Object.entries(PHASE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select value={dimDraft.type} onChange={(e) => setDimDraft((d) => ({ ...d, type: e.target.value as DimensionType }))} className={inputCls}>
                {Object.entries(DIM_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex items-end gap-2">
              <input value={dimDraft.description} onChange={(e) => setDimDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Description (optional)" className={clsx(inputCls, 'flex-1')} />
              <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap pb-0.5">
                <input type="checkbox" checked={dimDraft.isVisibleToAllReviewers} onChange={(e) => setDimDraft((d) => ({ ...d, isVisibleToAllReviewers: e.target.checked }))} className="rounded border-gray-300" />
                Visible to all
              </label>
            </div>
          </div>
          {dimDraft.type && (
            <p className="text-xs text-gray-400 italic">{DIM_TYPE_HELP[dimDraft.type]}</p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addDimension}
              disabled={!dimDraft.name.trim() || !dimDraft.weight}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40"
            >
              + Add Dimension
            </button>
          </div>
        </div>
      </Section>

      {/* Knockout Rules */}
      <Section
        title="Knockout Rules"
        subtitle="Mandatory criteria — failing these automatically flags an application for the configured action."
      >
        {knockouts.length > 0 && (
          <div className="mb-4 rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5">Rule</th>
                  <th className="text-left px-3 py-2.5">Condition</th>
                  <th className="text-left px-3 py-2.5">Expected</th>
                  <th className="text-left px-3 py-2.5">Action</th>
                  <th className="text-right px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {knockouts.map((k) => (
                  <tr key={k._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{k.name}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{KNOCKOUT_CONDITION_LABELS[k.condition]}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-700">{k.conditionValue}</td>
                    <td className="px-3 py-2.5">
                      <KnockoutActionBadge action={k.action} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => removeKnockout(k._id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add knockout form */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Add Knockout Rule</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={koDraft.name} onChange={(e) => setKoDraft((k) => ({ ...k, name: e.target.value }))} placeholder="Rule name (e.g. Work Authorization Required)" className={inputCls} />
            <input value={koDraft.errorMessage} onChange={(e) => setKoDraft((k) => ({ ...k, errorMessage: e.target.value }))} placeholder="Error message shown in review" className={inputCls} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Condition</label>
              <select value={koDraft.condition} onChange={(e) => setKoDraft((k) => ({ ...k, condition: e.target.value as KnockoutCondition }))} className={inputCls}>
                {Object.entries(KNOCKOUT_CONDITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Expected value</label>
              <input value={koDraft.conditionValue} onChange={(e) => setKoDraft((k) => ({ ...k, conditionValue: e.target.value }))} placeholder="e.g. yes, 5, Bangkok" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Action if triggered</label>
              <select value={koDraft.action} onChange={(e) => setKoDraft((k) => ({ ...k, action: e.target.value as KnockoutAction }))} className={inputCls}>
                <option value={KnockoutAction.REJECTION_REVIEW}>Flag for Rejection Review</option>
                <option value={KnockoutAction.NON_PROGRESSION}>Non Progression</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={addKnockout}
              disabled={!koDraft.name.trim() || !koDraft.errorMessage.trim()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40"
            >
              + Add Rule
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

function StepReview({ role, questions, scoring, dimensions, knockouts }: {
  role: RoleForm;
  questions: ScreeningQuestionDraft[];
  scoring: ScoringForm;
  dimensions: DimensionDraft[];
  knockouts: KnockoutRuleDraft[];
}) {
  const totalDimWeight = dimensions.reduce((s, d) => s + (parseFloat(d.weight) || 0), 0);

  return (
    <div className="space-y-5">
      <Section title="Role Details">
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <ReviewRow label="Title" value={role.title} />
          <ReviewRow label="Department" value={role.department} />
          <ReviewRow label="Level" value={LEVEL_LABELS[role.level as ExperienceLevel] ?? '—'} />
          <ReviewRow label="Type" value={TYPE_LABELS[role.employmentType as EmploymentType] ?? '—'} />
          <ReviewRow label="Location" value={`${role.location}${role.isRemote ? ' (Remote)' : ''}`} />
          <ReviewRow label="Head count" value={role.headcount || '1'} />
          {role.salaryMin && role.salaryMax && (
            <ReviewRow label="Salary" value={`${role.salaryCurrency} ${Number(role.salaryMin).toLocaleString()} – ${Number(role.salaryMax).toLocaleString()}`} />
          )}
          <ReviewRow label="Deadline" value={role.applicationDeadline || 'Open-ended'} />
          {role.interviewTypes.length > 0 && (
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-xs text-gray-500 mb-1">Interview Stages</dt>
              <dd className="flex flex-wrap gap-1">
                {role.interviewTypes.map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                    {INTERVIEW_TYPE_LABELS[t]}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
        {role.description && (
          <details className="mt-3">
            <summary className="text-xs text-indigo-600 cursor-pointer select-none">Preview description</summary>
            <div
              className="mt-2 prose prose-sm prose-gray max-w-none border rounded-lg p-3 bg-white"
              dangerouslySetInnerHTML={{ __html: role.description }}
            />
          </details>
        )}
      </Section>

      <Section title={`Application Form (${questions.length} question${questions.length !== 1 ? 's' : ''})`}>
        {questions.length === 0
          ? <p className="text-sm text-gray-400">No screening questions added.</p>
          : (
            <ol className="text-sm space-y-1.5 list-decimal list-inside">
              {questions.map((q) => (
                <li key={q._id} className="text-gray-700">
                  {q.question}
                  <span className="ml-2 text-xs text-gray-400">({QUESTION_TYPE_LABELS[q.type]})</span>
                  {q.isRequired && <span className="ml-1 text-red-500 text-xs">*</span>}
                  {q.isKnockout && <span className="ml-2 px-1 bg-red-100 text-red-700 text-xs rounded">Knockout</span>}
                </li>
              ))}
            </ol>
          )}
      </Section>

      <Section title="Scoring Configuration">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm mb-4">
          {[
            { label: 'Pre-Interview', value: `${scoring.preInterviewWeight}%` },
            { label: 'Post-Interview', value: `${scoring.postInterviewWeight}%` },
            { label: 'Shortlist ≥', value: `${scoring.shortlistThreshold}%` },
            { label: 'Pass ≥', value: `${scoring.passThreshold}%` },
            { label: 'Manual Review <', value: `${scoring.manualReviewThreshold}%` },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-lg p-2.5 text-center">
              <div className="font-bold text-indigo-600 text-base">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {dimensions.length > 0 && (
          <>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Dimensions ({dimensions.length}) — {totalDimWeight.toFixed(1)}% total weight
            </p>
            <ul className="text-sm space-y-1">
              {dimensions.map((d) => (
                <li key={d._id} className="flex items-center gap-2">
                  <DimTypeBadge type={d.type} />
                  <span className="text-gray-800 font-medium">{d.name}</span>
                  <span className="text-gray-400 text-xs">{PHASE_LABELS[d.phase]}</span>
                  <span className="ml-auto font-semibold text-indigo-600 text-xs">{d.weight}%</span>
                  {d.minimumThreshold && <span className="text-gray-400 text-xs">min {d.minimumThreshold}%</span>}
                </li>
              ))}
            </ul>
          </>
        )}

        {knockouts.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Knockout Rules ({knockouts.length})
            </p>
            <ul className="text-sm space-y-1">
              {knockouts.map((k) => (
                <li key={k._id} className="flex items-center gap-2">
                  <KnockoutActionBadge action={k.action} />
                  <span className="text-gray-800 font-medium">{k.name}</span>
                  <span className="text-gray-400 text-xs">{KNOCKOUT_CONDITION_LABELS[k.condition]} = {k.conditionValue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4">
        <p className="text-sm font-semibold text-indigo-800">Ready to submit?</p>
        <p className="text-xs text-indigo-600 mt-1">
          <strong>Save as Draft</strong> keeps the role private so you can continue editing.{' '}
          <strong>Publish Now</strong> makes it live on the careers portal immediately.
          Scoring rules can be revised after publishing subject to business governance.
        </p>
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, hint, children }: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
        {hint && <span className="ml-1 font-normal text-gray-400 text-xs">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-800 mt-0.5">{value || '—'}</dd>
    </div>
  );
}

function PhaseBar({ pre, post }: { pre: number; post: number }) {
  const sum = pre + post;
  const ok = Math.abs(sum - 100) < 0.01;
  return (
    <div className="mt-2">
      <div className="flex h-4 rounded-full overflow-hidden text-xs font-medium">
        <div
          className="flex items-center justify-center bg-indigo-500 text-white transition-all"
          style={{ width: `${Math.min(100, pre)}%` }}
        >
          {pre > 15 ? `${pre}% Pre` : ''}
        </div>
        <div
          className="flex items-center justify-center bg-violet-400 text-white transition-all"
          style={{ width: `${Math.min(100, post)}%` }}
        >
          {post > 15 ? `${post}% Post` : ''}
        </div>
      </div>
      {!ok && (
        <p className="text-xs text-red-600 mt-1">
          Total: {sum.toFixed(1)}% - must equal 100%
        </p>
      )}
    </div>
  );
}

function DimTypeBadge({ type }: { type: DimensionType }) {
  return (
    <span className={clsx(
      'px-2 py-0.5 rounded-full text-xs font-medium',
      type === DimensionType.MANDATORY && 'bg-blue-100 text-blue-700',
      type === DimensionType.OPTIONAL && 'bg-gray-100 text-gray-600',
      type === DimensionType.ADVISORY && 'bg-amber-100 text-amber-700',
      type === DimensionType.DISQUALIFYING && 'bg-red-100 text-red-700',
    )}>
      {DIM_TYPE_LABELS[type]}
    </span>
  );
}

function KnockoutActionBadge({ action }: { action: KnockoutAction }) {
  return (
    <span className={clsx(
      'px-2 py-0.5 rounded-full text-xs font-medium',
      action === KnockoutAction.NON_PROGRESSION && 'bg-red-100 text-red-700',
      action === KnockoutAction.REJECTION_REVIEW && 'bg-amber-100 text-amber-700',
      action === KnockoutAction.MANUAL_REVIEW_REQUIRED && 'bg-blue-100 text-blue-700',
    )}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500';
