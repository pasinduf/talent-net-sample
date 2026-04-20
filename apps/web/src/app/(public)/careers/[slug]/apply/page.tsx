'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCandidateToken,
  buildLinkedInAuthUrl,
  candidateFetcher,
  candidateApiCall,
} from '@/lib/candidateAuth';
import { API, publicApi } from '@/lib/api';
import { QuestionType, ConsentPurpose } from '@talent-net/types';
import { ArrowLeft, Check, CloudUpload, Upload } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ScreeningQuestion {
  id: string;
  question: string;
  type: QuestionType;
  isRequired: boolean;
  options: string[] | null;
}

interface CandidateProfile {
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
}

interface AnswerMap {
  [questionId: string]: { text?: string; options?: string[] };
}

const STEPS = ['Sign in', 'Personal details', 'Resume & links', 'Questions', 'Review & submit'];

// ─── Step 0: Auth gate ─────────────────────────────────────────────────────────

function AuthStep({ slug }: { slug: string }) {
  function handleLinkedIn() {
    const returnUrl = `/careers/${slug}/apply`;
    const state = encodeURIComponent(JSON.stringify({ returnUrl }));
    const redirectUri = `${window.location.origin}/careers/auth/callback`;
    window.location.href = buildLinkedInAuthUrl(redirectUri, state);
  }

  return (
    <div className="flex flex-col items-center text-center py-8 gap-6">
      <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center">
        <svg className="w-7 h-7 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H19M18.5 18.5V13.2A3.26 3.26 0 0 0 15.24 9.94C14.39 9.94 13.4 10.46 12.92 11.24V10.13H10.13V18.5H12.92V13.57C12.92 12.8 13.54 12.17 14.31 12.17A1.4 1.4 0 0 1 15.71 13.57V18.5H18.5M6.88 8.56A1.68 1.68 0 0 0 8.56 6.88C8.56 5.95 7.81 5.19 6.88 5.19A1.69 1.69 0 0 0 5.19 6.88C5.19 7.81 5.95 8.56 6.88 8.56M8.27 18.5V10.13H5.5V18.5H8.27Z" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in to apply</h2>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          We use LinkedIn to verify your identity. Your profile details will be pre-filled in the form.
        </p>
      </div>
      <button
        onClick={handleLinkedIn}
        className="flex items-center gap-2.5 px-6 py-3 bg-[#0A66C2] text-white font-semibold rounded-xl hover:bg-[#0958a8] transition-colors shadow-sm text-sm"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H19M18.5 18.5V13.2A3.26 3.26 0 0 0 15.24 9.94C14.39 9.94 13.4 10.46 12.92 11.24V10.13H10.13V18.5H12.92V13.57C12.92 12.8 13.54 12.17 14.31 12.17A1.4 1.4 0 0 1 15.71 13.57V18.5H18.5M6.88 8.56A1.68 1.68 0 0 0 8.56 6.88C8.56 5.95 7.81 5.19 6.88 5.19A1.69 1.69 0 0 0 5.19 6.88C5.19 7.81 5.95 8.56 6.88 8.56M8.27 18.5V10.13H5.5V18.5H8.27Z" />
        </svg>
        Continue with LinkedIn
      </button>
    </div>
  );
}

// ─── Step 1: Personal details ──────────────────────────────────────────────────

interface PersonalForm {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  country: string;
}

function PersonalStep({
  profile,
  form,
  onChange,
}: {
  profile: CandidateProfile;
  form: PersonalForm;
  onChange: (f: PersonalForm) => void;
}) {
  function field(label: string, key: keyof PersonalForm, required = false) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={form[key]}
          onChange={(e) => onChange({ ...form, [key]: e.target.value })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500 flex items-center gap-2">
        <span className="text-gray-400">✉</span>
        Applying as <strong className="text-gray-700 ml-1">{profile.email}</strong>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {field('First name', 'firstName', true)}
        {field('Last name', 'lastName', true)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {field('Country', 'country')}
        {field('City', 'city')}
      </div>
       <div className="grid grid-cols-2 gap-4">
        {field('Phone', 'phone')}
       </div>
    </div>
  );
}

// ─── Step 2: Resume & links ────────────────────────────────────────────────────

interface LinksForm {
  linkedInUrl: string;
  gitHubUrl: string;
  portfolioUrl: string;
  websiteUrl: string;
}

function ResumeStep({
  profile,
  resumeUrl,
  uploading,
  onFileChange,
  links,
  onLinksChange,
}: {
  profile: CandidateProfile;
  resumeUrl: string | null;
  uploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  links: LinksForm;
  onLinksChange: (f: LinksForm) => void;
}) {
  function linkField(label: string, key: keyof LinksForm, placeholder: string) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={placeholder}
          value={links[key]}
          onChange={(e) => onLinksChange({ ...links, [key]: e.target.value })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resume upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Resume / CV <span className="text-red-500">*</span>{' '}
          <span className="text-gray-400 font-normal">(PDF, DOC, DOCX — max 10 MB)</span>
        </label>
        {resumeUrl && (
          <div className="flex items-center gap-2 mb-3 p-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <span>
              <Check size={16}/>
            </span>
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline truncate"
            >
              {profile.resumeUrl === resumeUrl ? 'Current resume on file' : 'Resume uploaded'}
            </a>
          </div>
        )}
        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Uploading…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl text-gray-300">
                <CloudUpload size={24} />
              </span>
              <span className="text-sm text-gray-500">Click to upload or replace resume</span>
            </div>
          )}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={onFileChange}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Profile links */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Profile links
        </h3>
        {linkField('LinkedIn', 'linkedInUrl', 'https://linkedin.com/in/yourprofile')}
        {linkField('GitHub', 'gitHubUrl', 'https://github.com/yourusername')}
        {linkField('Portfolio', 'portfolioUrl', 'https://yourportfolio.com')}
        {linkField('Website', 'websiteUrl', 'https://yourwebsite.com')}
      </div>
    </div>
  );
}

function QuestionsStep({
  questions,
  answers,
  onChange,
}: {
  questions: ScreeningQuestion[];
  answers: AnswerMap;
  onChange: (a: AnswerMap) => void;
}) {
  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No screening questions for this role.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {questions.map((q, i) => {
        const ans = answers[q.id] ?? {};

        return (
          <div key={q.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-800">
              {i + 1}. {q.question}
              {q.isRequired && <span className="ml-1 text-red-500">*</span>}
            </label>

            {q.type === QuestionType.TEXT && (
              <input
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={ans.text ?? ''}
                onChange={(e) => onChange({ ...answers, [q.id]: { text: e.target.value } })}
              />
            )}

            {q.type === QuestionType.TEXTAREA && (
              <textarea
                rows={4}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={ans.text ?? ''}
                onChange={(e) => onChange({ ...answers, [q.id]: { text: e.target.value } })}
              />
            )}

            {q.type === QuestionType.YES_NO && (
              <div className="flex gap-4">
                {['Yes', 'No'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      checked={(ans.options ?? [])[0] === opt}
                      onChange={() => onChange({ ...answers, [q.id]: { options: [opt] } })}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === QuestionType.SINGLE_CHOICE && (
              <div className="space-y-2">
                {(q.options ?? []).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      checked={(ans.options ?? [])[0] === opt}
                      onChange={() => onChange({ ...answers, [q.id]: { options: [opt] } })}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === QuestionType.MULTI_CHOICE && (
              <div className="space-y-2">
                {(q.options ?? []).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(ans.options ?? []).includes(opt)}
                      onChange={(e) => {
                        const current = ans.options ?? [];
                        const updated = e.target.checked
                          ? [...current, opt]
                          : current.filter((o) => o !== opt);
                        onChange({ ...answers, [q.id]: { options: updated } });
                      }}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 4: Review & consent ──────────────────────────────────────────────────

interface ConsentMap {
  [purpose: string]: boolean;
}

function ReviewStep({
  profile,
  personal,
  links,
  resumeUrl,
  questions,
  answers,
  consents,
  onConsentsChange,
}: {
  profile: CandidateProfile;
  personal: PersonalForm;
  links: LinksForm;
  resumeUrl: string | null;
  questions: ScreeningQuestion[];
  answers: AnswerMap;
  consents: ConsentMap;
  onConsentsChange: (c: ConsentMap) => void;
}) {
  const consentOptions = [
    {
      purpose: ConsentPurpose.APPLICATION_PROCESSING,
      label: 'I consent to the processing of my application data for this role.',
      required: true,
    },
    {
      purpose: ConsentPurpose.FUTURE_OPPORTUNITIES,
      label: 'I would like to be considered for future opportunities at this company.',
      required: false,
    },
    {
      purpose: ConsentPurpose.TALENT_COMMUNITY,
      label: 'I agree to join the talent community and receive relevant updates.',
      required: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Applicant</p>
          <p className="text-sm font-medium text-gray-800">
            {personal.firstName} {personal.lastName}
          </p>
          <p className="text-sm text-gray-500">{profile.email}</p>
          {personal.phone && <p className="text-sm text-gray-500">{personal.phone}</p>}
          {(personal.city || personal.country) && (
            <p className="text-sm text-gray-500">
              {[personal.city, personal.country].filter(Boolean).join(', ')}
            </p>
          )}
        </div>

        {resumeUrl && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Resume</p>
            <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 underline">
              View uploaded resume
            </a>
          </div>
        )}

        {questions.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Answers</p>
            <div className="space-y-2">
              {questions.map((q) => {
                const ans = answers[q.id];
                const value = ans?.options?.join(', ') ?? ans?.text ?? '—';
                return (
                  <div key={q.id}>
                    <p className="text-xs text-gray-500">{q.question}</p>
                    <p className="text-sm text-gray-800">{value || '—'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Consents */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Consent & agreements</h3>
        <div className="space-y-3">
          {consentOptions.map(({ purpose, label, required }) => (
            <label key={purpose} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 accent-indigo-600"
                checked={consents[purpose] ?? false}
                onChange={(e) => onConsentsChange({ ...consents, [purpose]: e.target.checked })}
              />
              <span className="text-sm text-gray-700">
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [job, setJob] = useState<any>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Step 1 state
  const [personal, setPersonal] = useState<PersonalForm>({
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    country: '',
  });

  // Step 2 state
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [links, setLinks] = useState<LinksForm>({
    linkedInUrl: '',
    gitHubUrl: '',
    portfolioUrl: '',
    websiteUrl: '',
  });

  // Step 3 state
  const [answers, setAnswers] = useState<AnswerMap>({});

  // Step 4 state
  const [consents, setConsents] = useState<ConsentMap>({});

  const isAuthed = !!getCandidateToken();
  const questions: ScreeningQuestion[] = job?.applicationForm?.screeningQuestions ?? [];
  const hasQuestions = questions.length > 0;
  // Step indices: 0=auth, 1=personal, 2=resume, 3=questions (skipped when none), REVIEW_STEP=review
  const REVIEW_STEP = hasQuestions ? 4 : 3;
  // Progress bar is only shown when authed, so 'Sign in' is always done — exclude it.
  // currentStepIndex = step - 1 then maps correctly: step 1 → index 0 (Personal details), etc.
  const visibleSteps = STEPS.filter(
    (s) => s !== 'Sign in' && (hasQuestions || s !== 'Questions')
  );

  // Load job
  useEffect(() => {
    publicApi.getJob(slug).then((d: any) => setJob(d.data)).catch(() => setLoadError('Job not found'));
  }, [slug]);

  // Load candidate profile once authed
  useEffect(() => {
    if (!isAuthed) return;
    setProfileLoading(true);
    candidateFetcher(`${API}/candidates/me`)
      .then((res: any) => {
        const data = res.data;
        if (res.error) return;
        setProfile(data);
        setPersonal({
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          phone: data.phone ?? '',
          city: data.city ?? '',
          country: data.country ?? '',
        });
        setLinks({
          linkedInUrl: data.linkedInUrl ?? '',
          gitHubUrl: data.gitHubUrl ?? '',
          portfolioUrl: data.portfolioUrl ?? '',
          websiteUrl: data.websiteUrl ?? '',
        });
        setResumeUrl(data.resumeUrl ?? null);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [isAuthed]);

  // Move past auth step once token is present
  useEffect(() => {
    if (isAuthed && step === 0) setStep(1);
  }, [isAuthed, step]);

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
      setResumeUrl(uploadJson.secure_url);
    } catch (err: any) {
      alert(err.message ?? 'Resume upload failed');
    } finally {
      setUploading(false);
    }
  }

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!personal.firstName.trim() || !personal.lastName.trim())
        return 'First name and last name are required.';
    }
    if (s === 2) {
      if (!resumeUrl) return 'Please upload your CV before continuing.';
    }
    if (s === 3 && hasQuestions) {
      for (const q of questions) {
        if (!q.isRequired) continue;
        const ans = answers[q.id];
        const hasAnswer =
          (ans?.text && ans.text.trim()) || (ans?.options && ans.options.length > 0);
        if (!hasAnswer) return `Please answer: "${q.question}"`;
      }
    }
    if (s === REVIEW_STEP) {
      if (!consents[ConsentPurpose.APPLICATION_PROCESSING])
        return 'You must consent to application data processing before submitting.';
    }
    return null;
  }

  function nextStep() {
    const err = validateStep(step);
    if (err) { setSubmitError(err); return; }
    setSubmitError(null);
    setStep((s) => s + 1);
  }

  async function submit() {
    const err = validateStep(step);
    if (err) { setSubmitError(err); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const consentPayload = Object.entries(consents).map(([purpose, isGranted]) => ({
        purpose,
        isGranted,
      }));

      const answerPayload = Object.entries(answers).map(([questionId, ans]) => ({
        questionId,
        answerText: ans.text ?? null,
        answerOptions: ans.options ?? null,
      }));

      await candidateApiCall(`${API}/public/jobs/${slug}/apply`, {
        resumeUrl: resumeUrl ?? undefined,
        profile: {
          phone: personal.phone || null,
          city: personal.city || null,
          country: personal.country || null,
          linkedInUrl: links.linkedInUrl || null,
          gitHubUrl: links.gitHubUrl || null,
          portfolioUrl: links.portfolioUrl || null,
          websiteUrl: links.websiteUrl || null,
        },
        answers: answerPayload,
        consents: consentPayload,
      });

      router.push(`/careers/${slug}/apply/success`);
      // leave submitting=true — the redirect will unmount the page
    } catch (err: any) {
      setSubmitError(err.message ?? 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">{loadError}</p>
        <Link href="/careers" className="mt-4 inline-block text-sm text-indigo-600 underline">
          Back to jobs
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentStepIndex = step - 1; // step 1 = index 0 (Personal details)

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href={`/careers/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={14} /> {job.title}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Apply - {job.title}</h1>
      <p className="text-sm text-gray-500 mb-8">
        {job.department} · {job.location}
      </p>

      {/* Progress */}
      {isAuthed && (
        <div className="mb-8">
          <div className="flex items-center gap-0">
            {visibleSteps.map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                      i < currentStepIndex
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : i === currentStepIndex
                        ? 'border-indigo-600 text-indigo-600 bg-white'
                        : 'border-gray-200 text-gray-400 bg-white'
                    }`}
                  >
                    {i < currentStepIndex ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-xs mt-1 whitespace-nowrap ${
                      i === currentStepIndex ? 'text-indigo-600 font-medium' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < visibleSteps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 mt-[-10px] ${
                      i < currentStepIndex ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        {step === 0 && <AuthStep slug={slug} />}
        {step >= 1 && profileLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {step === 1 && !profileLoading && profile && (
          <PersonalStep profile={profile} form={personal} onChange={setPersonal} />
        )}
        {step === 2 && profile && (
          <ResumeStep
            profile={profile}
            resumeUrl={resumeUrl}
            uploading={uploading}
            onFileChange={uploadResume}
            links={links}
            onLinksChange={setLinks}
          />
        )}
        {step === 3 && hasQuestions && (
          <QuestionsStep questions={questions} answers={answers} onChange={setAnswers} />
        )}
        {step === REVIEW_STEP && profile && (
          <ReviewStep
            profile={profile}
            personal={personal}
            links={links}
            resumeUrl={resumeUrl}
            questions={questions}
            answers={answers}
            consents={consents}
            onConsentsChange={setConsents}
          />
        )}

        {submitError && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {submitError}
          </p>
        )}

        {/* Navigation */}
        {isAuthed && !profileLoading && (
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { setSubmitError(null); setStep((s) => Math.max(1, s - 1)); }}
              disabled={step <= 1}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Back
            </button>

            {step < REVIEW_STEP ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="px-6 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Submit application
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
