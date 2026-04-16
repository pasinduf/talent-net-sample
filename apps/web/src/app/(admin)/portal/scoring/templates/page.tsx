'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { useConfirmModal } from '@/components/ui/ConfirmModal';
import { DimensionType, EvaluationPhase, KnockoutCondition, KnockoutAction } from '@talent-net/types';
import { API, fetcher, apiCall } from '@/lib/api';

const PHASE_LABELS: Record<EvaluationPhase, string> = {
  [EvaluationPhase.PRE_INTERVIEW]: 'Pre',
  [EvaluationPhase.POST_INTERVIEW]: 'Post',
  [EvaluationPhase.BOTH]: 'Both',
};

const DIM_TYPE_COLORS: Record<DimensionType, string> = {
  [DimensionType.MANDATORY]: 'bg-blue-100 text-blue-700',
  [DimensionType.OPTIONAL]: 'bg-gray-100 text-gray-600',
  [DimensionType.ADVISORY]: 'bg-amber-100 text-amber-700',
  [DimensionType.DISQUALIFYING]: 'bg-red-100 text-red-700',
};

const ACTION_LABELS: Record<KnockoutAction, string> = {
  [KnockoutAction.NON_PROGRESSION]: 'Block',
  [KnockoutAction.REJECTION_REVIEW]: 'Flag',
  [KnockoutAction.MANUAL_REVIEW_REQUIRED]: 'Review',
};

const CONDITION_LABELS: Record<KnockoutCondition, string> = {
  [KnockoutCondition.CERTIFICATION_REQUIRED]: 'Certification',
  [KnockoutCondition.WORK_AUTHORIZATION]: 'Work Auth',
  [KnockoutCondition.LANGUAGE_REQUIREMENT]: 'Language',
  [KnockoutCondition.AVAILABILITY_REQUIREMENT]: 'Availability',
  [KnockoutCondition.MINIMUM_EDUCATION]: 'Education',
  [KnockoutCondition.MINIMUM_EXPERIENCE_YEARS]: 'Experience',
  [KnockoutCondition.LOCATION_REQUIREMENT]: 'Location',
  [KnockoutCondition.CUSTOM]: 'Custom',
};

export default function ScoringTemplatesPage() {
  const { data, isLoading, mutate } = useSWR(`${API}/scoring/templates`, fetcher);
  const templates: any[] = data?.data ?? [];

  const { confirm, confirmModal } = useConfirmModal();

  // Inline rename state keyed by template id
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Expanded template for detail view
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function removeTemplate(t: any) {
    const ok = await confirm({
      title: 'Remove template?',
      description: `"${t.templateName}" will no longer appear in the template library. The job's scoring configuration will remain unchanged.`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!ok) return;

    const toastId = toast.loading('Removing template…');
    try {
      await apiCall(`${API}/jobs/${t.jobId}/scoring`, { isTemplate: false, templateName: null }, 'PATCH');
      toast.success('Template removed.', { id: toastId });
      mutate();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to remove template.', { id: toastId });
    }
  }

  function startRename(t: any) {
    setRenamingId(t.id);
    setRenameValue(t.templateName ?? '');
  }

  async function saveRename(t: any) {
    if (!renameValue.trim()) {
      toast.error('Template name cannot be empty.');
      return;
    }
    const toastId = toast.loading('Renaming…');
    try {
      await apiCall(`${API}/jobs/${t.jobId}/scoring`, { templateName: renameValue.trim() }, 'PATCH');
      toast.success('Template renamed.', { id: toastId });
      setRenamingId(null);
      mutate();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to rename template.', { id: toastId });
    }
  }

  return (
    <>
      {confirmModal}
      <div className="p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <nav className="text-sm text-gray-500 mb-2 flex items-center gap-2">
              <Link href="/portal/jobs" className="hover:text-indigo-600">Jobs</Link>
              <span>/</span>
              <span className="text-gray-800">Scoring Templates</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">Scoring Templates</h1>
            <p className="text-sm text-gray-500 mt-1">
              Reusable scoring configurations. Apply them to any job from its scoring page.
            </p>
          </div>
          <div className="text-sm text-gray-400">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* How-to hint */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 flex gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <span>
            To create a template, open any job's scoring configuration and click{' '}
            <strong>Save as Template</strong>. Templates are copies of the configuration at the time
            of saving — editing the job's scoring later does not update the template.
          </span>
        </div>

        {/* Template list */}
        {isLoading ? (
          <div className="text-center text-gray-400 animate-pulse py-16">Loading templates…</div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
            <p className="text-gray-500 font-medium mb-1">No templates yet.</p>
            <p className="text-sm text-gray-400">
              Configure scoring for a job, then save it as a template to reuse it here.
            </p>
            <Link
              href="/portal/jobs"
              className="inline-block mt-4 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Go to Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((t: any) => {
              const isExpanded = expandedId === t.id;
              const isRenaming = renamingId === t.id;

              return (
                <div
                  key={t.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  {/* Card header */}
                  <div className="px-6 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <input
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveRename(t);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => saveRename(t)}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setRenamingId(null)}
                            className="text-sm text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <h2 className="text-base font-semibold text-gray-900 truncate">{t.templateName}</h2>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                        <span>{t.dimensionCount} dimension{t.dimensionCount !== 1 ? 's' : ''}</span>
                        <span>{t.knockoutRuleCount} knockout rule{t.knockoutRuleCount !== 1 ? 's' : ''}</span>
                        <span>Pre: {t.preInterviewWeight}% / Post: {t.postInterviewWeight}%</span>
                        <span>Shortlist ≥ {t.shortlistThreshold}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                      >
                        {isExpanded ? 'Hide details' : 'View details'}
                      </button>
                      <Link
                        href={`/portal/jobs/${t.jobId}/scoring`}
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                      >
                        View source
                      </Link>
                      {!isRenaming && (
                        <button
                          onClick={() => startRename(t)}
                          className="px-3 py-1.5 text-xs border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50"
                        >
                          Rename
                        </button>
                      )}
                      <button
                        onClick={() => removeTemplate(t)}
                        className="px-3 py-1.5 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-6 py-5 bg-gray-50 space-y-5">
                      {/* Thresholds */}
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Score Thresholds
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          {[
                            { label: 'Scale Max', value: t.totalScaleMax },
                            { label: 'Pre-Interview', value: `${t.preInterviewWeight}%` },
                            { label: 'Post-Interview', value: `${t.postInterviewWeight}%` },
                            { label: 'Shortlist ≥', value: `${t.shortlistThreshold}%` },
                          ].map((s) => (
                            <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                              <div className="text-lg font-bold text-indigo-600">{s.value}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dimensions */}
                      {t.evaluationDimensions?.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Evaluation Dimensions
                          </h3>
                          <div className="space-y-1.5">
                            {t.evaluationDimensions.map((d: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 px-4 py-2.5 text-sm"
                              >
                                <span className="flex-1 font-medium text-gray-800">{d.name}</span>
                                <span className="text-xs text-gray-500">
                                  {PHASE_LABELS[d.phase as EvaluationPhase]}
                                </span>
                                <span className={clsx(
                                  'px-2 py-0.5 rounded-full text-xs font-medium',
                                  DIM_TYPE_COLORS[d.type as DimensionType]
                                )}>
                                  {d.type}
                                </span>
                                <span className="font-semibold text-indigo-600 w-12 text-right">
                                  {d.weight}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Knockout rules */}
                      {t.knockoutRules?.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Knockout Rules
                          </h3>
                          <div className="space-y-1.5">
                            {t.knockoutRules.map((r: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 px-4 py-2.5 text-sm"
                              >
                                <span className="flex-1 font-medium text-gray-800">{r.name}</span>
                                <span className="text-xs text-gray-500">
                                  {CONDITION_LABELS[r.condition as KnockoutCondition]}
                                </span>
                                <span className={clsx(
                                  'px-2 py-0.5 rounded-full text-xs font-medium',
                                  r.action === KnockoutAction.NON_PROGRESSION
                                    ? 'bg-red-100 text-red-700'
                                    : r.action === KnockoutAction.REJECTION_REVIEW
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-blue-100 text-blue-700'
                                )}>
                                  {ACTION_LABELS[r.action as KnockoutAction]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
