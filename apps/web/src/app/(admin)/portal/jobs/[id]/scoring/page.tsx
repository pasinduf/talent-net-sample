'use client';

/**
 * Scoring Configuration Editor — /portal/jobs/[id]/scoring
 *
 * Sections:
 *  1. Overview (phase weights + thresholds) — editable inline via PATCH /jobs/{jobId}/scoring
 *  2. Evaluation Dimensions — add / remove / inline-edit weight
 *  3. Knockout Rules — add / remove
 */

import { useState, useCallback } from 'react';
import { use } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { useConfirmModal } from '@/components/ui/ConfirmModal';
import {
  DimensionType,
  EvaluationPhase,
  KnockoutCondition,
  KnockoutAction,
} from '@talent-net/types';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

// ─── Shared helpers ───────────────────────────────────────────────────────────

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tn_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  } as Record<string, string>;
}

function fetcher(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tn_token') : null;
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
}

async function apiCall(url: string, body?: unknown, method = 'POST') {
  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as any)?.error?.message ?? `Server error ${res.status}`);
  }
  return json;
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<EvaluationPhase, string> = {
  [EvaluationPhase.PRE_INTERVIEW]: 'Pre-Interview',
  [EvaluationPhase.POST_INTERVIEW]: 'Post-Interview',
  [EvaluationPhase.BOTH]: 'Both Phases',
};

const DIMENSION_TYPE_LABELS: Record<DimensionType, string> = {
  [DimensionType.MANDATORY]: 'Mandatory',
  [DimensionType.OPTIONAL]: 'Optional',
  [DimensionType.ADVISORY]: 'Advisory',
  [DimensionType.DISQUALIFYING]: 'Disqualifying',
};

const KNOCKOUT_CONDITION_LABELS: Record<KnockoutCondition, string> = {
  [KnockoutCondition.CERTIFICATION_REQUIRED]: 'Certification Required',
  [KnockoutCondition.WORK_AUTHORIZATION]: 'Work Authorization',
  [KnockoutCondition.LANGUAGE_REQUIREMENT]: 'Language Requirement',
  [KnockoutCondition.AVAILABILITY_REQUIREMENT]: 'Availability Requirement',
  [KnockoutCondition.MINIMUM_EDUCATION]: 'Minimum Education',
  [KnockoutCondition.MINIMUM_EXPERIENCE_YEARS]: 'Min. Years of Experience',
  [KnockoutCondition.LOCATION_REQUIREMENT]: 'Location Requirement',
  [KnockoutCondition.CUSTOM]: 'Custom',
};

const DIM_TYPE_COLORS: Record<DimensionType, string> = {
  [DimensionType.MANDATORY]: 'bg-blue-100 text-blue-700',
  [DimensionType.OPTIONAL]: 'bg-gray-100 text-gray-600',
  [DimensionType.ADVISORY]: 'bg-amber-100 text-amber-700',
  [DimensionType.DISQUALIFYING]: 'bg-red-100 text-red-700',
};

const ACTION_COLORS: Record<KnockoutAction, string> = {
  [KnockoutAction.NON_PROGRESSION]: 'bg-red-100 text-red-700',
  [KnockoutAction.REJECTION_REVIEW]: 'bg-amber-100 text-amber-700',
  [KnockoutAction.MANUAL_REVIEW_REQUIRED]: 'bg-blue-100 text-blue-700',
};

// ─── Form types ───────────────────────────────────────────────────────────────

interface OverviewForm {
  preInterviewWeight: string;
  postInterviewWeight: string;
  shortlistThreshold: string;
  passThreshold: string;
  manualReviewThreshold: string;
}

interface DimensionForm {
  name: string;
  weight: string;
  type: DimensionType;
  phase: EvaluationPhase;
  minimumThreshold: string;
  isVisibleToAllReviewers: boolean;
  description: string;
}

interface KnockoutForm {
  name: string;
  condition: KnockoutCondition;
  conditionValue: string;
  action: KnockoutAction;
  errorMessage: string;
  description: string;
}

const DEFAULT_DIM: DimensionForm = {
  name: '', weight: '', type: DimensionType.MANDATORY,
  phase: EvaluationPhase.PRE_INTERVIEW, minimumThreshold: '',
  isVisibleToAllReviewers: true, description: '',
};

const DEFAULT_KNOCKOUT: KnockoutForm = {
  name: '', condition: KnockoutCondition.WORK_AUTHORIZATION,
  conditionValue: '', action: KnockoutAction.REJECTION_REVIEW,
  errorMessage: '', description: '',
};

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400';
const smInputCls = 'px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScoringConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);

  const { data: jobData } = useSWR(`${API}/jobs/${jobId}`, fetcher);
  const { data: configData, mutate } = useSWR(`${API}/jobs/${jobId}/scoring`, fetcher);
  const { data: validationData, mutate: mutateValidation } = useSWR(
    `${API}/jobs/${jobId}/scoring/validate`,
    fetcher
  );

  const job = jobData?.data;
  const config = configData?.data;
  const validation = validationData?.data;

  // Overview edit state
  const [editingOverview, setEditingOverview] = useState(false);
  const [overviewForm, setOverviewForm] = useState<OverviewForm | null>(null);

  // Add-dimension form state
  const [dimForm, setDimForm] = useState<DimensionForm>(DEFAULT_DIM);
  const [showAddDim, setShowAddDim] = useState(false);

  // Inline-edit dimension state (keyed by dimension id)
  const [editingDimId, setEditingDimId] = useState<string | null>(null);
  const [editingDimForm, setEditingDimForm] = useState<Partial<DimensionForm>>({});

  const { confirm, confirmModal } = useConfirmModal();

  // Add-knockout form state
  const [knockoutForm, setKnockoutForm] = useState<KnockoutForm>(DEFAULT_KNOCKOUT);
  const [showAddKnockout, setShowAddKnockout] = useState(false);

  // Inline-edit knockout state (keyed by rule id)
  const [editingKnockoutId, setEditingKnockoutId] = useState<string | null>(null);
  const [editingKnockoutForm, setEditingKnockoutForm] = useState<Partial<KnockoutForm>>({});

  const refresh = useCallback(() => {
    mutate();
    mutateValidation();
  }, [mutate, mutateValidation]);

  // ── Overview: open edit mode ────────────────────────────────────────────────

  function openOverviewEdit() {
    if (!config) return;
    setOverviewForm({
      preInterviewWeight: String(config.preInterviewWeight),
      postInterviewWeight: String(config.postInterviewWeight),
      shortlistThreshold: String(config.shortlistThreshold),
      passThreshold: String(config.passThreshold),
      manualReviewThreshold: String(config.manualReviewThreshold),
    });
    setEditingOverview(true);
  }

  function setOv<K extends keyof OverviewForm>(k: K, v: string) {
    setOverviewForm((f) => (f ? { ...f, [k]: v } : f));
  }

  async function saveOverview() {
    if (!overviewForm) return;
    const pre = Number(overviewForm.preInterviewWeight);
    const post = Number(overviewForm.postInterviewWeight);
    if (Math.abs(pre + post - 100) > 0.01) {
      toast.error('Pre-interview + post-interview weights must sum to 100%.');
      return;
    }
    const toastId = toast.loading('Saving configuration…');
    try {
      await apiCall(`${API}/jobs/${jobId}/scoring`, {
        preInterviewWeight: pre,
        postInterviewWeight: post,
        shortlistThreshold: Number(overviewForm.shortlistThreshold),
        passThreshold: Number(overviewForm.passThreshold),
        manualReviewThreshold: Number(overviewForm.manualReviewThreshold),
      }, 'PATCH');
      toast.success('Configuration updated.', { id: toastId });
      setEditingOverview(false);
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update configuration.', { id: toastId });
    }
  }

  // ── Init config ─────────────────────────────────────────────────────────────

  async function initConfig() {
    const toastId = toast.loading('Creating scoring configuration…');
    try {
      await apiCall(`${API}/jobs/${jobId}/scoring`, {
        totalScaleMax: 100,
        preInterviewWeight: 60,
        postInterviewWeight: 40,
        shortlistThreshold: 75,
        passThreshold: 60,
        manualReviewThreshold: 40,
      });
      toast.success('Scoring configuration created.', { id: toastId });
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create configuration.', { id: toastId });
    }
  }

  // ── Dimensions ──────────────────────────────────────────────────────────────

  async function addDimension(e: React.FormEvent) {
    e.preventDefault();
    if (!dimForm.name.trim() || !dimForm.weight) {
      toast.error('Name and weight are required.');
      return;
    }
    const toastId = toast.loading('Adding dimension…');
    try {
      await apiCall(`${API}/jobs/${jobId}/scoring/dimensions`, {
        name: dimForm.name.trim(),
        weight: Number(dimForm.weight),
        type: dimForm.type,
        phase: dimForm.phase,
        minimumThreshold: dimForm.minimumThreshold ? Number(dimForm.minimumThreshold) : undefined,
        isVisibleToAllReviewers: dimForm.isVisibleToAllReviewers,
        description: dimForm.description || undefined,
        order: config?.evaluationDimensions?.length ?? 0,
      });
      toast.success('Dimension added.', { id: toastId });
      setDimForm(DEFAULT_DIM);
      setShowAddDim(false);
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add dimension.', { id: toastId });
    }
  }

  function startEditDim(d: any) {
    setEditingDimId(d.id);
    setEditingDimForm({
      name: d.name,
      weight: String(d.weight),
      type: d.type,
      phase: d.phase,
      minimumThreshold: d.minimumThreshold != null ? String(d.minimumThreshold) : '',
      isVisibleToAllReviewers: d.isVisibleToAllReviewers,
      description: d.description ?? '',
    });
  }

  async function saveDimension(dimId: string) {
    const f = editingDimForm;
    const toastId = toast.loading('Saving dimension…');
    try {
      await apiCall(
        `${API}/jobs/${jobId}/scoring/dimensions/${dimId}`,
        {
          name: f.name?.trim(),
          weight: f.weight ? Number(f.weight) : undefined,
          type: f.type,
          phase: f.phase,
          minimumThreshold: f.minimumThreshold ? Number(f.minimumThreshold) : null,
          isVisibleToAllReviewers: f.isVisibleToAllReviewers,
          description: f.description || null,
        },
        'PATCH'
      );
      toast.success('Dimension updated.', { id: toastId });
      setEditingDimId(null);
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update dimension.', { id: toastId });
    }
  }

  async function removeDimension(dimId: string, name: string) {
    const ok = await confirm({
      title: 'Remove dimension?',
      description: `"${name}" will be removed from this scoring configuration.`,
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    const toastId = toast.loading('Removing dimension…');
    try {
      await apiCall(`${API}/jobs/${jobId}/scoring/dimensions/${dimId}`, undefined, 'DELETE');
      toast.success('Dimension removed.', { id: toastId });
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to remove dimension.', { id: toastId });
    }
  }

  // ── Knockout rules ───────────────────────────────────────────────────────────

  async function addKnockoutRule(e: React.FormEvent) {
    e.preventDefault();
    if (!knockoutForm.name.trim() || !knockoutForm.errorMessage.trim()) {
      toast.error('Name and error message are required.');
      return;
    }
    const toastId = toast.loading('Adding knockout rule…');
    try {
      await apiCall(`${API}/jobs/${jobId}/scoring/knockout-rules`, {
        name: knockoutForm.name.trim(),
        condition: knockoutForm.condition,
        conditionValue: knockoutForm.conditionValue,
        action: knockoutForm.action,
        errorMessage: knockoutForm.errorMessage.trim(),
        description: knockoutForm.description || undefined,
      });
      toast.success('Knockout rule added.', { id: toastId });
      setKnockoutForm(DEFAULT_KNOCKOUT);
      setShowAddKnockout(false);
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to add knockout rule.', { id: toastId });
    }
  }

  function startEditKnockout(r: any) {
    setEditingKnockoutId(r.id);
    setEditingKnockoutForm({
      name: r.name,
      condition: r.condition,
      conditionValue: r.conditionValue,
      action: r.action,
      errorMessage: r.errorMessage ?? '',
      description: r.description ?? '',
    });
  }

  async function saveKnockoutRule(ruleId: string) {
    const f = editingKnockoutForm;
    const toastId = toast.loading('Saving rule…');
    try {
      await apiCall(
        `${API}/jobs/${jobId}/scoring/knockout-rules/${ruleId}`,
        {
          name: f.name?.trim(),
          condition: f.condition,
          conditionValue: f.conditionValue,
          action: f.action,
          errorMessage: f.errorMessage?.trim() || undefined,
          description: f.description || null,
        },
        'PATCH'
      );
      toast.success('Rule updated.', { id: toastId });
      setEditingKnockoutId(null);
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update rule.', { id: toastId });
    }
  }

  async function removeKnockoutRule(ruleId: string, name: string) {
    const ok = await confirm({
      title: 'Remove knockout rule?',
      description: `"${name}" will be removed from this scoring configuration.`,
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    const toastId = toast.loading('Removing rule…');
    try {
      await apiCall(`${API}/jobs/${jobId}/scoring/knockout-rules/${ruleId}`, undefined, 'DELETE');
      toast.success('Rule removed.', { id: toastId });
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to remove rule.', { id: toastId });
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!jobData) {
    return <div className="p-6 animate-pulse text-gray-400">Loading…</div>;
  }

  return (
    <>
    {confirmModal}
    <div className="p-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <Link href="/portal/jobs" className="hover:text-indigo-600">Jobs</Link>
        <span>/</span>
        <Link href={`/portal/jobs/${jobId}`} className="hover:text-indigo-600">{job?.title ?? jobId}</Link>
        <span>/</span>
        <span className="text-gray-800">Scoring</span>
      </nav>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scoring & Evaluation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define evaluation dimensions, phase weights, and knockout rules for{' '}
            <strong>{job?.title}</strong>.
          </p>
        </div>

        {validation && (
          <div className={clsx(
            'px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 flex-shrink-0',
            validation.isReadyToPublish
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          )}>
            <span>{validation.isReadyToPublish ? '✓' : '⚠'}</span>
            {validation.isReadyToPublish ? 'Ready to publish' : 'Needs attention'}
          </div>
        )}
      </div>

      {/* Validation errors / warnings */}
      {validation && (validation.errors?.length > 0 || validation.warnings?.length > 0) && (
        <div className="mb-6 space-y-2">
          {validation.errors?.map((e: string, i: number) => (
            <div key={i} className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 flex gap-2">
              <span>✕</span>{e}
            </div>
          ))}
          {validation.warnings?.map((w: string, i: number) => (
            <div key={i} className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700 flex gap-2">
              <span>⚠</span>{w}
            </div>
          ))}
        </div>
      )}

      {/* ── No config yet ────────────────────────────────────────────────────── */}
      {!config && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500 mb-2 font-medium">No scoring configuration yet.</p>
          <p className="text-sm text-gray-400 mb-6">
            Start with sensible defaults — you can adjust thresholds and add dimensions afterwards.
          </p>
          <button
            onClick={initConfig}
            className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Create Scoring Configuration
          </button>
        </div>
      )}

      {config && (
        <div className="space-y-6">

          {/* ── Overview ──────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Configuration Overview</h2>
              {!editingOverview ? (
                <button
                  onClick={openOverviewEdit}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingOverview(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveOverview}
                    className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            {!editingOverview ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { label: 'Pre-Interview', value: `${config.preInterviewWeight}%` },
                    { label: 'Post-Interview', value: `${config.postInterviewWeight}%` },
                    { label: 'Shortlist ≥', value: `${config.shortlistThreshold}%` },
                    { label: 'Pass ≥', value: `${config.passThreshold}%` },
                    { label: 'Manual Review ≥', value: `${config.manualReviewThreshold}%` },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-indigo-600">{s.value}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Weight progress bar */}
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Dimension weight used</span>
                    <span className={clsx('font-semibold', config.isWeightBalanced ? 'text-green-600' : 'text-red-600')}>
                      {Number(config.totalWeightUsed).toFixed(1)}% / 100%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all', config.isWeightBalanced ? 'bg-green-500' : 'bg-red-500')}
                      style={{ width: `${Math.min(100, config.totalWeightUsed)}%` }}
                    />
                  </div>
                </div>
              </>
            ) : overviewForm && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      Pre-Interview Weight (%)
                      <span className="ml-1 font-normal text-gray-400">must sum to 100 with post</span>
                    </label>
                    <input
                      type="number" min="0" max="100" step="1"
                      value={overviewForm.preInterviewWeight}
                      onChange={(e) => {
                        const pre = Number(e.target.value);
                        setOv('preInterviewWeight', e.target.value);
                        setOv('postInterviewWeight', String(100 - pre));
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">Post-Interview Weight (%)</label>
                    <input
                      type="number" min="0" max="100" step="1"
                      value={overviewForm.postInterviewWeight}
                      onChange={(e) => {
                        const post = Number(e.target.value);
                        setOv('postInterviewWeight', e.target.value);
                        setOv('preInterviewWeight', String(100 - post));
                      }}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">Shortlist Threshold (%)</label>
                    <input type="number" min="0" max="100" value={overviewForm.shortlistThreshold}
                      onChange={(e) => setOv('shortlistThreshold', e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">Pass Threshold (%)</label>
                    <input type="number" min="0" max="100" value={overviewForm.passThreshold}
                      onChange={(e) => setOv('passThreshold', e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">Manual Review Threshold (%)</label>
                    <input type="number" min="0" max="100" value={overviewForm.manualReviewThreshold}
                      onChange={(e) => setOv('manualReviewThreshold', e.target.value)} className={inputCls} />
                  </div>
                </div>
                {/* Live sum indicator */}
                {(() => {
                  const sum = Number(overviewForm.preInterviewWeight) + Number(overviewForm.postInterviewWeight);
                  const ok = Math.abs(sum - 100) < 0.01;
                  return (
                    <p className={clsx('text-xs', ok ? 'text-green-600' : 'text-red-600')}>
                      Phase weights sum: {sum}% {ok ? '✓' : '- must equal 100%'}
                    </p>
                  );
                })()}
              </div>
            )}
          </div>

          {/* ── Evaluation Dimensions ──────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Evaluation Dimensions</h2>
                <p className="text-xs text-gray-400 mt-0.5">All weights must sum to 100%</p>
              </div>
              <button
                onClick={() => { setShowAddDim((v) => !v); setDimForm(DEFAULT_DIM); }}
                className={clsx(
                  'px-3 py-1.5 text-sm rounded-lg font-medium transition-colors',
                  showAddDim
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                )}
              >
                {showAddDim ? 'Cancel' : '+ Add Dimension'}
              </button>
            </div>

            {/* Dimensions table */}
            {config.evaluationDimensions.length === 0 && !showAddDim ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No dimensions yet. Click <strong>+ Add Dimension</strong> to get started.
              </div>
            ) : config.evaluationDimensions.length > 0 && (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3">Dimension</th>
                    <th className="text-left px-4 py-3">Phase</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-right px-4 py-3">Weight</th>
                    <th className="text-right px-4 py-3">Min.</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {config.evaluationDimensions.map((d: any) => {
                    const isEditing = editingDimId === d.id;
                    const ef = editingDimForm;
                    return (
                      <tr key={d.id} className={clsx('hover:bg-gray-50', isEditing && 'bg-indigo-50/40')}>
                        {isEditing ? (
                          <>
                            <td className="px-6 py-3" colSpan={5}>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                                <input
                                  className={smInputCls}
                                  placeholder="Name"
                                  value={ef.name ?? ''}
                                  onChange={(e) => setEditingDimForm((f) => ({ ...f, name: e.target.value }))}
                                />
                                <input
                                  type="number" min={0.01} max={100} step={0.01}
                                  className={smInputCls}
                                  placeholder="Weight %"
                                  value={ef.weight ?? ''}
                                  onChange={(e) => setEditingDimForm((f) => ({ ...f, weight: e.target.value }))}
                                />
                                <select
                                  className={smInputCls}
                                  value={ef.phase ?? EvaluationPhase.PRE_INTERVIEW}
                                  onChange={(e) => setEditingDimForm((f) => ({ ...f, phase: e.target.value as EvaluationPhase }))}
                                >
                                  {Object.entries(PHASE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                                <select
                                  className={smInputCls}
                                  value={ef.type ?? DimensionType.MANDATORY}
                                  onChange={(e) => setEditingDimForm((f) => ({ ...f, type: e.target.value as DimensionType }))}
                                >
                                  {Object.entries(DIMENSION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="number" min={0} max={100}
                                  className={clsx(smInputCls, 'w-32')}
                                  placeholder="Min threshold %"
                                  value={ef.minimumThreshold ?? ''}
                                  onChange={(e) => setEditingDimForm((f) => ({ ...f, minimumThreshold: e.target.value }))}
                                />
                                <input
                                  className={clsx(smInputCls, 'flex-1')}
                                  placeholder="Description (optional)"
                                  value={ef.description ?? ''}
                                  onChange={(e) => setEditingDimForm((f) => ({ ...f, description: e.target.value }))}
                                />
                                <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={ef.isVisibleToAllReviewers ?? true}
                                    onChange={(e) => setEditingDimForm((f) => ({ ...f, isVisibleToAllReviewers: e.target.checked }))}
                                    className="rounded"
                                  />
                                  Visible to all
                                </label>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button onClick={() => setEditingDimId(null)} className="text-xs text-gray-400 hover:text-gray-600 mr-3">
                                Cancel
                              </button>
                              <button onClick={() => saveDimension(d.id)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                Save
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-3 font-medium text-gray-800">
                              {d.name}
                              {d.description && <div className="text-xs text-gray-400 font-normal">{d.description}</div>}
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">{PHASE_LABELS[d.phase as EvaluationPhase]}</td>
                            <td className="px-4 py-3">
                              <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', DIM_TYPE_COLORS[d.type as DimensionType])}>
                                {DIMENSION_TYPE_LABELS[d.type as DimensionType]}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-indigo-600">{d.weight}%</td>
                            <td className="px-4 py-3 text-right text-gray-500 text-xs">
                              {d.minimumThreshold != null ? `${d.minimumThreshold}%` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button onClick={() => startEditDim(d)} className="text-xs text-indigo-500 hover:text-indigo-700 mr-3">
                                Edit
                              </button>
                              <button onClick={() => removeDimension(d.id, d.name)} className="text-xs text-red-400 hover:text-red-600">
                                Remove
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Add dimension form */}
            {showAddDim && (
              <form onSubmit={addDimension} className="p-6 border-t border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">New Evaluation Dimension</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                  <input
                    required placeholder="Name (e.g. Skill Match)"
                    value={dimForm.name}
                    onChange={(e) => setDimForm((f) => ({ ...f, name: e.target.value }))}
                    className={inputCls}
                  />
                  <div className="flex gap-2">
                    <input
                      required type="number" min={0.01} max={100} step={0.01}
                      placeholder="Weight %"
                      value={dimForm.weight}
                      onChange={(e) => setDimForm((f) => ({ ...f, weight: e.target.value }))}
                      className={clsx(inputCls, 'w-28')}
                    />
                    <input
                      type="number" min={0} max={100}
                      placeholder="Min %"
                      value={dimForm.minimumThreshold}
                      onChange={(e) => setDimForm((f) => ({ ...f, minimumThreshold: e.target.value }))}
                      className={clsx(inputCls, 'w-24')}
                    />
                  </div>
                  <select
                    value={dimForm.phase}
                    onChange={(e) => setDimForm((f) => ({ ...f, phase: e.target.value as EvaluationPhase }))}
                    className={inputCls}
                  >
                    {Object.entries(PHASE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <select
                    value={dimForm.type}
                    onChange={(e) => setDimForm((f) => ({ ...f, type: e.target.value as DimensionType }))}
                    className={inputCls}
                  >
                    {Object.entries(DIMENSION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    placeholder="Description (optional)"
                    value={dimForm.description}
                    onChange={(e) => setDimForm((f) => ({ ...f, description: e.target.value }))}
                    className={clsx(inputCls, 'flex-1')}
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={dimForm.isVisibleToAllReviewers}
                      onChange={(e) => setDimForm((f) => ({ ...f, isVisibleToAllReviewers: e.target.checked }))}
                      className="rounded"
                    />
                    Visible to all reviewers
                  </label>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ── Knockout Rules ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Knockout Rules</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Mandatory criteria that block or flag candidates who do not meet them
                </p>
              </div>
              <button
                onClick={() => { setShowAddKnockout((v) => !v); setKnockoutForm(DEFAULT_KNOCKOUT); }}
                className={clsx(
                  'px-3 py-1.5 text-sm rounded-lg font-medium transition-colors',
                  showAddKnockout
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                )}
              >
                {showAddKnockout ? 'Cancel' : '+ Add Rule'}
              </button>
            </div>

            {config.knockoutRules.length === 0 && !showAddKnockout ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No knockout rules configured. Knockout rules are optional.
              </div>
            ) : config.knockoutRules.length > 0 && (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3">Rule</th>
                    <th className="text-left px-4 py-3">Condition</th>
                    <th className="text-left px-4 py-3">Expected</th>
                    <th className="text-left px-4 py-3">Action</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {config.knockoutRules.map((r: any) => {
                    const isEditing = editingKnockoutId === r.id;
                    const ef = editingKnockoutForm;
                    return (
                      <tr key={r.id} className={clsx('hover:bg-gray-50', isEditing && 'bg-indigo-50/40')}>
                        {isEditing ? (
                          <>
                            <td className="px-6 py-3" colSpan={4}>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                <input
                                  className={smInputCls}
                                  placeholder="Rule name"
                                  value={ef.name ?? ''}
                                  onChange={(e) => setEditingKnockoutForm((f) => ({ ...f, name: e.target.value }))}
                                />
                                <input
                                  className={smInputCls}
                                  placeholder="Error message shown in review"
                                  value={ef.errorMessage ?? ''}
                                  onChange={(e) => setEditingKnockoutForm((f) => ({ ...f, errorMessage: e.target.value }))}
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <select
                                  className={smInputCls}
                                  value={ef.condition ?? KnockoutCondition.WORK_AUTHORIZATION}
                                  onChange={(e) => setEditingKnockoutForm((f) => ({ ...f, condition: e.target.value as KnockoutCondition }))}
                                >
                                  {Object.entries(KNOCKOUT_CONDITION_LABELS).map(([v, l]) => (
                                    <option key={v} value={v}>{l}</option>
                                  ))}
                                </select>
                                <input
                                  className={smInputCls}
                                  placeholder="Expected value (e.g. yes, 5)"
                                  value={ef.conditionValue ?? ''}
                                  onChange={(e) => setEditingKnockoutForm((f) => ({ ...f, conditionValue: e.target.value }))}
                                />
                                <select
                                  className={smInputCls}
                                  value={ef.action ?? KnockoutAction.REJECTION_REVIEW}
                                  onChange={(e) => setEditingKnockoutForm((f) => ({ ...f, action: e.target.value as KnockoutAction }))}
                                >
                                  <option value={KnockoutAction.REJECTION_REVIEW}>Flag for Rejection Review</option>
                                  <option value={KnockoutAction.NON_PROGRESSION}>Block Progression</option>
                                  <option value={KnockoutAction.MANUAL_REVIEW_REQUIRED}>Require Manual Review</option>
                                </select>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button onClick={() => setEditingKnockoutId(null)} className="text-xs text-gray-400 hover:text-gray-600 mr-3">
                                Cancel
                              </button>
                              <button onClick={() => saveKnockoutRule(r.id)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                Save
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-3 font-medium text-gray-800">
                              {r.name}
                              {!r.isActive && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
                              {r.errorMessage && <div className="text-xs text-gray-400 font-normal">{r.errorMessage}</div>}
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">
                              {KNOCKOUT_CONDITION_LABELS[r.condition as KnockoutCondition]}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.conditionValue}</td>
                            <td className="px-4 py-3">
                              <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', ACTION_COLORS[r.action as KnockoutAction])}>
                                {r.action.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button onClick={() => startEditKnockout(r)} className="text-xs text-indigo-500 hover:text-indigo-700 mr-3">
                                Edit
                              </button>
                              <button onClick={() => removeKnockoutRule(r.id, r.name)} className="text-xs text-red-400 hover:text-red-600">
                                Remove
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Add knockout rule form */}
            {showAddKnockout && (
              <form onSubmit={addKnockoutRule} className="p-6 border-t border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">New Knockout Rule</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input
                    required placeholder="Rule name (e.g. Work Authorization Required)"
                    value={knockoutForm.name}
                    onChange={(e) => setKnockoutForm((f) => ({ ...f, name: e.target.value }))}
                    className={inputCls}
                  />
                  <input
                    required placeholder="Error message shown in review"
                    value={knockoutForm.errorMessage}
                    onChange={(e) => setKnockoutForm((f) => ({ ...f, errorMessage: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={knockoutForm.condition}
                    onChange={(e) => setKnockoutForm((f) => ({ ...f, condition: e.target.value as KnockoutCondition }))}
                    className={inputCls}
                  >
                    {Object.entries(KNOCKOUT_CONDITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input
                    required placeholder="Expected value (e.g. yes, 5)"
                    value={knockoutForm.conditionValue}
                    onChange={(e) => setKnockoutForm((f) => ({ ...f, conditionValue: e.target.value }))}
                    className={inputCls}
                  />
                  <div className="flex gap-2">
                    <select
                      value={knockoutForm.action}
                      onChange={(e) => setKnockoutForm((f) => ({ ...f, action: e.target.value as KnockoutAction }))}
                      className={clsx(inputCls, 'flex-1')}
                    >
                      <option value={KnockoutAction.REJECTION_REVIEW}>Flag for Rejection Review</option>
                      <option value={KnockoutAction.NON_PROGRESSION}>Block Progression</option>
                      <option value={KnockoutAction.MANUAL_REVIEW_REQUIRED}>Require Manual Review</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

        </div>
      )}
    </div>
    </>
  );
}
