'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCandidateToken, candidateFetcher, candidateApiCall, clearCandidateToken } from '@/lib/candidateAuth';
import { API } from '@/lib/api';
import { ApplicationStatus } from '@talent-net/types';
import { toast } from 'sonner';
import { useConfirmModal } from '@/components/ui/ConfirmModal';
import { ArrowLeft, Pencil, LogOut, UploadCloud, CheckCircle2, ExternalLink } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  linkedInUrl: string | null;
  gitHubUrl: string | null;
  portfolioUrl: string | null;
  websiteUrl: string | null;
  resumeUrl: string | null;
  subscribeToJobAlerts: boolean;
  subscribeToTalentCommunity: boolean;
}

interface ApplicationJob {
  id: string;
  title: string;
  slug: string;
  department: string;
  location: string;
  status: string;
}

interface Application {
  id: string;
  status: ApplicationStatus;
  submittedAt: string;
  job: ApplicationJob | null;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  applied: 'bg-blue-50 text-blue-700',
  under_review: 'bg-amber-50 text-amber-700',
  shortlisted: 'bg-indigo-50 text-indigo-700',
  interview_pending: 'bg-purple-50 text-purple-700',
  interview_completed: 'bg-purple-50 text-purple-700',
  hold: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-50 text-red-600',
  talent_pool: 'bg-teal-50 text-teal-700',
  offer_stage: 'bg-green-50 text-green-700',
  withdrawn: 'bg-gray-100 text-gray-500',
  closed: 'bg-gray-100 text-gray-500',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600';
  const label = status.replace(/_/g, ' ');
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{title}</h2>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Read-only field row ──────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4">
      <dt className="w-36 flex-shrink-0 text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-800">{value || <span className="text-gray-400 italic">—</span>}</dd>
    </div>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface EditForm {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  country: string;
  linkedInUrl: string;
  gitHubUrl: string;
  portfolioUrl: string;
  websiteUrl: string;
  subscribeToJobAlerts: boolean;
  subscribeToTalentCommunity: boolean;
}

function EditModal({
  form,
  saving,
  error,
  onChange,
  onSave,
  onClose,
}: {
  form: EditForm;
  saving: boolean;
  error: string | null;
  onChange: (f: EditForm) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  function field(label: string, key: keyof EditForm, placeholder = '', required = false) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={placeholder}
          value={form[key] as string}
          onChange={(e) => onChange({ ...form, [key]: e.target.value })}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Edit profile</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field('First name', 'firstName', '', true)}
            {field('Last name', 'lastName', '', true)}
          </div>
          {field('Phone', 'phone', '+1 555 000 0000')}
          <div className="grid grid-cols-2 gap-4">
            {field('Country', 'country', 'e.g. United States')}
            {field('City', 'city', 'e.g. San Francisco')}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Profile links</p>
            <div className="space-y-3">
              {field('LinkedIn', 'linkedInUrl', 'https://linkedin.com/in/...')}
              {field('GitHub', 'gitHubUrl', 'https://github.com/...')}
              {field('Portfolio', 'portfolioUrl', 'https://...')}
              {field('Website', 'websiteUrl', 'https://...')}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Preferences</p>
            {(['subscribeToJobAlerts', 'subscribeToTalentCommunity'] as const).map((key) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-indigo-600"
                  checked={form[key]}
                  onChange={(e) => onChange({ ...form, [key]: e.target.checked })}
                />
                <span className="text-sm text-gray-700">
                  {key === 'subscribeToJobAlerts' ? 'Notify me about new job openings' : 'Join the talent community'}
                </span>
              </label>
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CandidateProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { confirm, confirmModal } = useConfirmModal();

  // Redirect unauthenticated visitors
  useEffect(() => {
    if (!getCandidateToken()) {
      router.replace('/careers');
    }
  }, [router]);

  // Load profile + applications in parallel
  useEffect(() => {
    if (!getCandidateToken()) return;
    Promise.all([
      candidateFetcher(`${API}/candidates/me`),
      candidateFetcher(`${API}/candidates/me/applications`),
    ])
      .then(([profile, applications]) => {
        setProfile(profile.data);
        setApplications(applications.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openEdit() {
    if (!profile) return;
    setEditForm({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      phone: profile.phone ?? '',
      city: profile.city ?? '',
      country: profile.country ?? '',
      linkedInUrl: profile.linkedInUrl ?? '',
      gitHubUrl: profile.gitHubUrl ?? '',
      portfolioUrl: profile.portfolioUrl ?? '',
      websiteUrl: profile.websiteUrl ?? '',
      subscribeToJobAlerts: profile.subscribeToJobAlerts ?? false,
      subscribeToTalentCommunity: profile.subscribeToTalentCommunity ?? false,
    });
    setSaveError(null);
    setEditOpen(true);
  }

  async function saveProfile() {
    if (!editForm) return;
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      setSaveError('First name and last name are required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await candidateApiCall(`${API}/candidates/me`, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone || null,
        city: editForm.city || null,
        country: editForm.country || null,
        linkedInUrl: editForm.linkedInUrl || null,
        gitHubUrl: editForm.gitHubUrl || null,
        portfolioUrl: editForm.portfolioUrl || null,
        websiteUrl: editForm.websiteUrl || null,
        subscribeToJobAlerts: editForm.subscribeToJobAlerts,
        subscribeToTalentCommunity: editForm.subscribeToTalentCommunity,
      }, 'PATCH');
      setProfile((prev) => prev ? { ...prev, ...(res.data ?? res) } : (res.data ?? res));
      setEditOpen(false);
      toast.success('Profile updated successfully.');
    } catch (err: any) {
      const msg = err.message ?? 'Failed to save. Please try again.';
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function uploadResume(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const response = await candidateApiCall(`${API}/uploads/cloudinary-sign`, {
        folder: 'resumes',
        resourceType: 'raw',
      });
      const signRes = response.data;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signRes.apiKey);
      formData.append('timestamp', String(signRes.timestamp));
      formData.append('signature', signRes.signature);
      formData.append('folder', signRes.folder);
      formData.append('resource_type', 'raw');

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signRes.cloudName}/raw/upload`,
        { method: 'POST', body: formData }
      );
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson?.error?.message ?? 'Upload failed');

      // Persist the new URL to the candidate profile
      const updated = await candidateApiCall(`${API}/candidates/me`, {
        resumeUrl: uploadJson.secure_url,
      }, 'PATCH');
      const resumeUrl = (updated.data ?? updated).resumeUrl;
      setProfile((prev) => prev ? { ...prev, resumeUrl } : prev);
      toast.success('Resume updated successfully.');
    } catch (err: any) {
      toast.error(err.message ?? 'Resume upload failed');
    } finally {
      setUploading(false);
      // reset input so same file can be re-selected
      e.target.value = '';
    }
  }

  async function signOut() {
    const ok = await confirm({
      title: 'Sign out?',
      description: 'You will be returned to the careers page.',
      confirmLabel: 'Sign out',
      cancelLabel: 'Cancel',
      variant: 'warning',
    });
    if (!ok) return;
    clearCandidateToken();
    router.push('/careers');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  const location = [profile.city, profile.country].filter(Boolean).join(', ');

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Back */}
      <Link
        href="/careers"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={14} /> Open roles
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{profile.email}</p>
          {location && <p className="text-sm text-gray-400 mt-0.5">{location}</p>}
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>

      <div className="space-y-6">
        {/* Personal details */}
        <Section
          title="Personal details"
          action={
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              <Pencil size={13} /> Edit
            </button>
          }
        >
          <dl className="space-y-3">
            <FieldRow label="First name" value={profile.firstName} />
            <FieldRow label="Last name" value={profile.lastName} />
            <FieldRow label="Email" value={profile.email} />
            <FieldRow label="Phone" value={profile.phone} />
            <FieldRow label="Country" value={profile.country} />
            <FieldRow label="City" value={profile.city} />
          </dl>
        </Section>

        {/* Resume */}
        <Section title="Resume / CV">
          <div className="space-y-3">
            {profile.resumeUrl ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800">Resume on file</p>
                  <a
                    href={profile.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    View current resume <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No resume uploaded yet.</p>
            )}

            <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-sm text-gray-500">
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <UploadCloud size={16} className="text-gray-400" />
                  {profile.resumeUrl ? 'Replace resume' : 'Upload resume'}{' '}
                  <span className="text-gray-400 text-xs">(PDF, DOC, DOCX)</span>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={uploadResume}
                disabled={uploading}
              />
            </label>
          </div>
        </Section>

        {/* Profile links */}
        <Section
          title="Profile links"
          action={
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              <Pencil size={13} /> Update
            </button>
          }
        >
          <dl className="space-y-3">
            {(
              [
                ['LinkedIn', profile.linkedInUrl],
                ['GitHub', profile.gitHubUrl],
                ['Portfolio', profile.portfolioUrl],
                ['Website', profile.websiteUrl],
              ] as [string, string | null][]
            ).map(([label, url]) => (
              <div
                key={label}
                className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4"
              >
                <dt className="w-36 flex-shrink-0 text-xs text-gray-400 uppercase tracking-wide">
                  {label}
                </dt>
                <dd className="text-sm">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1 truncate"
                    >
                      {url} <ExternalLink size={11} className="flex-shrink-0" />
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">—</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* Application history */}
        <Section title={`Application history (${applications.length})`}>
          {applications.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400">No applications yet.</p>
              <Link
                href="/careers"
                className="mt-3 inline-block text-sm text-indigo-600 hover:underline"
              >
                Browse open roles
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {applications.map((app) => (
                <li key={app.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {app.job ? (
                        <a
                          href={`/careers/${app.job.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 mt-0.5 text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                        >
                          {app.job.title} <ExternalLink size={11} />
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-gray-900">Unknown role</p>
                      )}
                      {app.job && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {app.job.department} · {app.job.location}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Applied{' '}
                        {new Date(app.submittedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Preferences */}
        <Section
          title="Preferences"
          action={
            <button
              onClick={openEdit}
              className="mt-4 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <Pencil size={12} /> Update preferences
            </button>
          }
        >
          <dl className="space-y-3">
            <FieldRow
              label="Job alerts"
              value={profile.subscribeToJobAlerts ? 'Subscribed' : 'Not subscribed'}
            />
            <FieldRow
              label="Talent community"
              value={profile.subscribeToTalentCommunity ? 'Joined' : 'Not joined'}
            />
          </dl>
        </Section>
      </div>

      {/* Edit modal */}
      {editOpen && editForm && (
        <EditModal
          form={editForm}
          saving={saving}
          error={saveError}
          onChange={setEditForm}
          onSave={saveProfile}
          onClose={() => setEditOpen(false)}
        />
      )}
      {confirmModal}
    </div>
  );
}
