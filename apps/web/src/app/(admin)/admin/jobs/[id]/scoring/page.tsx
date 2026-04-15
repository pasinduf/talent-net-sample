'use client';

/**
 * Scoring Configuration Editor — /admin/jobs/[id]/scoring
 *
 * This is the primary HR workspace for defining:
 *  - Evaluation dimensions with custom weights per phase
 *  - Threshold settings (shortlist, pass, manual review)
 *  - Knockout rules (mandatory criteria)
 *
 * Entirely client-side rendered (CSR) — auth token from localStorage.
 */

import { useState, useCallback } from 'react';
import { use } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { clsx } from 'clsx';
import {
  DimensionType,
  EvaluationPhase,
  KnockoutCondition,
  KnockoutAction,
} from '@talent-net/types';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

function authFetcher(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tn_token') : null;
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
}

async function authPost(url: string, body?: unknown, method = 'POST') {
  const token = localStorage.getItem('tn_token');
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

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
  [KnockoutCondition.MINIMUM_EXPERIENCE_YEARS]: 'Minimum Years of Experience',
  [KnockoutCondition.LOCATION_REQUIREMENT]: 'Location Requirement',
  [KnockoutCondition.CUSTOM]: 'Custom',
};

interface DimensionFormState {
  name: string;
  weight: number;
  type: DimensionType;
  phase: EvaluationPhase;
  minimumThreshold: string;
  isVisibleToAllReviewers: boolean;
  description: string;
}

interface KnockoutFormState {
  name: string;
  condition: KnockoutCondition;
  conditionValue: string;
  action: KnockoutAction;
  errorMessage: string;
  description: string;
}

const defaultDimension: DimensionFormState = {
  name: '',
  weight: 0,
  type: DimensionType.MANDATORY,
  phase: EvaluationPhase.PRE_INTERVIEW,
  minimumThreshold: '',
  isVisibleToAllReviewers: true,
  description: '',
};

const defaultKnockout: KnockoutFormState = {
  name: '',
  condition: KnockoutCondition.WORK_AUTHORIZATION,
  conditionValue: 'yes',
  action: KnockoutAction.REJECTION_REVIEW,
  errorMessage: '',
  description: '',
};

export default function ScoringConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);

  const { data: jobData } = useSWR(`${API}/jobs/${jobId}`, authFetcher);
  const { data: configData, mutate } = useSWR(`${API}/jobs/${jobId}/scoring`, authFetcher);
  const { data: validationData, mutate: mutateValidation } = useSWR(
    `${API}/jobs/${jobId}/scoring/validate`,
    authFetcher
  );

  const job = jobData?.data;
  const config = configData?.data;
  const validation = validationData?.data;

  const [dimForm, setDimForm] = useState<DimensionFormState>(defaultDimension);
  const [knockoutForm, setKnockoutForm] = useState<KnockoutFormState>(defaultKnockout);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    mutate();
    mutateValidation();
  }, [mutate, mutateValidation]);

  async function initConfig() {
    setSaving(true);
    setError('');
    try {
      await authPost(`${API}/jobs/${jobId}/scoring`, {
        totalScaleMax: 100,
        preInterviewWeight: 60,
        postInterviewWeight: 40,
        shortlistThreshold: 75,
        passThreshold: 60,
        manualReviewThreshold: 40,
      });
      refresh();
    } catch {
      setError('Failed to create scoring configuration.');
    } finally {
      setSaving(false);
    }
  }

  async function addDimension(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await authPost(`${API}/jobs/${jobId}/scoring/dimensions`, {
        name: dimForm.name,
        weight: dimForm.weight,
        type: dimForm.type,
        phase: dimForm.phase,
        minimumThreshold: dimForm.minimumThreshold ? Number(dimForm.minimumThreshold) : undefined,
        isVisibleToAllReviewers: dimForm.isVisibleToAllReviewers,
        description: dimForm.description || undefined,
        order: config?.evaluationDimensions?.length ?? 0,
      });

      if (!res.success) {
        setError(res.error?.message ?? 'Failed to add dimension.');
      } else {
        setDimForm(defaultDimension);
        refresh();
      }
    } catch {
      setError('Failed to add evaluation dimension.');
    } finally {
      setSaving(false);
    }
  }

  async function removeDimension(dimId: string) {
    await authPost(`${API}/jobs/${jobId}/scoring/dimensions/${dimId}`, undefined, 'DELETE');
    refresh();
  }

  async function addKnockoutRule(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await authPost(`${API}/jobs/${jobId}/scoring/knockout-rules`, {
        name: knockoutForm.name,
        condition: knockoutForm.condition,
        conditionValue: knockoutForm.conditionValue,
        action: knockoutForm.action,
        errorMessage: knockoutForm.errorMessage,
        description: knockoutForm.description || undefined,
      });

      if (!res.success) {
        setError(res.error?.message ?? 'Failed to add knockout rule.');
      } else {
        setKnockoutForm(defaultKnockout);
        refresh();
      }
    } catch {
      setError('Failed to add knockout rule.');
    } finally {
      setSaving(false);
    }
  }

  async function removeKnockoutRule(ruleId: string) {
    await authPost(`${API}/jobs/${jobId}/scoring/knockout-rules/${ruleId}`, undefined, 'DELETE');
    refresh();
  }

  if (!jobData) {
    return <div className="p-6 animate-pulse text-gray-400">Loading…</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/admin/jobs" className="hover:text-indigo-600">Jobs</Link>
        <span className="mx-2">/</span>
        <Link href={`/admin/jobs/${jobId}`} className="hover:text-indigo-600">
          {job?.title ?? jobId}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">Scoring Configuration</span>
      </nav>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scoring & Evaluation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define evaluation dimensions, weights, and knockout rules for{' '}
            <strong>{job?.title}</strong>.
          </p>
        </div>

        {/* Validation status */}
        {validation && (
          <div
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2',
              validation.isReadyToPublish
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            )}
          >
            <span>{validation.isReadyToPublish ? '✓' : '⚠'}</span>
            {validation.isReadyToPublish ? 'Ready to publish' : 'Needs attention'}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Validation errors / warnings */}
      {validation && (validation.errors?.length > 0 || validation.warnings?.length > 0) && (
        <div className="mb-6 space-y-2">
          {validation.errors?.map((e: string, i: number) => (
            <div key={i} className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 flex gap-2">
              <span>✕</span> {e}
            </div>
          ))}
          {validation.warnings?.map((w: string, i: number) => (
            <div key={i} className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700 flex gap-2">
              <span>⚠</span> {w}
            </div>
          ))}
        </div>
      )}

      {/* ── No config yet ── */}
      {!config && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500 mb-4">No scoring configuration yet for this job.</p>
          <button
            onClick={initConfig}
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Scoring Configuration'}
          </button>
        </div>
      )}

      {config && (
        <div className="space-y-8">
          {/* ── Overview card ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Configuration Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total Scale', value: `${config.totalScaleMax} pts` },
                { label: 'Pre-Interview', value: `${config.preInterviewWeight}%` },
                { label: 'Post-Interview', value: `${config.postInterviewWeight}%` },
                { label: 'Shortlist ≥', value: `${config.shortlistThreshold}%` },
                { label: 'Pass ≥', value: `${config.passThreshold}%` },
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-indigo-600">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Weight progress bar */}
            <div className="mt-5">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Total weight used</span>
                <span
                  className={clsx(
                    config.isWeightBalanced ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'
                  )}
                >
                  {Number(config.totalWeightUsed).toFixed(1)}% / 100%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all',
                    config.isWeightBalanced ? 'bg-green-500' : 'bg-red-500'
                  )}
                  style={{ width: `${Math.min(100, config.totalWeightUsed)}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Evaluation Dimensions ── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Evaluation Dimensions</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  All dimension weights must sum to 100%
                </p>
              </div>
            </div>

            {/* Existing dimensions */}
            {config.evaluationDimensions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No dimensions yet. Add the first one below.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3">Dimension</th>
                    <th className="text-left px-4 py-3">Phase</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-right px-4 py-3">Weight</th>
                    <th className="text-right px-4 py-3">Min. Threshold</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {config.evaluationDimensions.map((d: any) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-800">
                        {d.name}
                        {d.description && (
                          <div className="text-xs text-gray-400 font-normal">{d.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {PHASE_LABELS[d.phase as EvaluationPhase]}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          d.type === DimensionType.MANDATORY && 'bg-blue-100 text-blue-700',
                          d.type === DimensionType.OPTIONAL && 'bg-gray-100 text-gray-600',
                          d.type === DimensionType.ADVISORY && 'bg-amber-100 text-amber-700',
                          d.type === DimensionType.DISQUALIFYING && 'bg-red-100 text-red-700',
                        )}>
                          {DIMENSION_TYPE_LABELS[d.type as DimensionType]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-indigo-600">
                        {d.weight}%
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {d.minimumThreshold != null ? `${d.minimumThreshold}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeDimension(d.id)}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Add dimension form */}
            <form onSubmit={addDimension} className="p-6 border-t border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Add Evaluation Dimension</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  required
                  placeholder="Name (e.g. Skill Match)"
                  value={dimForm.name}
                  onChange={(e) => setDimForm((f) => ({ ...f, name: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <div className="flex gap-2">
                  <input
                    required
                    type="number"
                    min={0.01}
                    max={100}
                    step={0.01}
                    placeholder="Weight %"
                    value={dimForm.weight || ''}
                    onChange={(e) => setDimForm((f) => ({ ...f, weight: Number(e.target.value) }))}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-28"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Min %"
                    value={dimForm.minimumThreshold}
                    onChange={(e) => setDimForm((f) => ({ ...f, minimumThreshold: e.target.value }))}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-24"
                  />
                </div>
                <select
                  value={dimForm.phase}
                  onChange={(e) => setDimForm((f) => ({ ...f, phase: e.target.value as EvaluationPhase }))}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {Object.entries(PHASE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <select
                  value={dimForm.type}
                  onChange={(e) => setDimForm((f) => ({ ...f, type: e.target.value as DimensionType }))}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {Object.entries(DIMENSION_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <input
                  placeholder="Description (optional)"
                  value={dimForm.description}
                  onChange={(e) => setDimForm((f) => ({ ...f, description: e.target.value }))}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* ── Knockout Rules ── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Knockout Rules</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Mandatory criteria that block or flag candidates who do not meet them
              </p>
            </div>

            {config.knockoutRules.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No knockout rules configured.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3">Rule</th>
                    <th className="text-left px-4 py-3">Condition</th>
                    <th className="text-left px-4 py-3">Expected Value</th>
                    <th className="text-left px-4 py-3">Action</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {config.knockoutRules.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-800">
                        {r.name}
                        {!r.isActive && (
                          <span className="ml-2 text-xs text-gray-400">(inactive)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {KNOCKOUT_CONDITION_LABELS[r.condition as KnockoutCondition]}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {r.conditionValue}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          r.action === KnockoutAction.NON_PROGRESSION && 'bg-red-100 text-red-700',
                          r.action === KnockoutAction.REJECTION_REVIEW && 'bg-amber-100 text-amber-700',
                          r.action === KnockoutAction.MANUAL_REVIEW_REQUIRED && 'bg-blue-100 text-blue-700',
                        )}>
                          {r.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeKnockoutRule(r.id)}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Add knockout rule form */}
            <form onSubmit={addKnockoutRule} className="p-6 border-t border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Add Knockout Rule</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  required
                  placeholder="Rule name (e.g. Work Authorization Required)"
                  value={knockoutForm.name}
                  onChange={(e) => setKnockoutForm((f) => ({ ...f, name: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <input
                  required
                  placeholder="Error message shown in review"
                  value={knockoutForm.errorMessage}
                  onChange={(e) => setKnockoutForm((f) => ({ ...f, errorMessage: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={knockoutForm.condition}
                  onChange={(e) => setKnockoutForm((f) => ({ ...f, condition: e.target.value as KnockoutCondition }))}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {Object.entries(KNOCKOUT_CONDITION_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <input
                  required
                  placeholder="Expected value (e.g. yes, 5)"
                  value={knockoutForm.conditionValue}
                  onChange={(e) => setKnockoutForm((f) => ({ ...f, conditionValue: e.target.value }))}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <div className="flex gap-2">
                  <select
                    value={knockoutForm.action}
                    onChange={(e) => setKnockoutForm((f) => ({ ...f, action: e.target.value as KnockoutAction }))}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value={KnockoutAction.REJECTION_REVIEW}>Flag for Rejection Review</option>
                    <option value={KnockoutAction.NON_PROGRESSION}>Block Progression</option>
                    <option value={KnockoutAction.MANUAL_REVIEW_REQUIRED}>Require Manual Review</option>
                  </select>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
