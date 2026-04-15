import OpenAI from 'openai';

// ─── Client ───────────────────────────────────────────────────────────────────

/**
 * OpenRouter is OpenAI-API-compatible — we just swap the base URL and add the
 * required HTTP-Referer / X-Title headers that OpenRouter recommends.
 */
function createClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.API_BASE_URL ?? 'https://talent-net.example.com',
      'X-Title': 'TalentNet Hiring Platform',
    },
  });
}

const MODEL = () => process.env.OPENROUTER_MODEL ?? 'google/gemini-flash-1.5';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EvaluationDimensionInput {
  id: string;
  name: string;
  description: string;
  weight: number;           // 0–100
  phase: 'pre_interview' | 'post_interview' | 'both';
  scoringGuidance?: string | null;
  minimumThreshold?: number | null;
}

export interface ApplicationAnswerInput {
  questionText: string;
  answerText: string | null;
}

export interface EvaluateCandidateInput {
  jobTitle: string;
  jobDescription: string;
  requiredSkills?: string[];
  evaluationDimensions: EvaluationDimensionInput[];
  totalScaleMax: number;
  applicationAnswers: ApplicationAnswerInput[];
  candidateName?: string;
  /** 'pre_interview' to score only pre-interview dims, 'post_interview' for post, 'both' for all */
  phase: 'pre_interview' | 'post_interview';
}

export interface DimensionScore {
  dimensionId: string;
  dimensionName: string;
  rawScore: number;         // 0 – totalScaleMax
  weightedScore: number;    // rawScore * (weight / 100)
  weight: number;
  phase: string;
  reasoning: string;
}

export interface EvaluateCandidateResult {
  dimensionScores: DimensionScore[];
  preInterviewScore: number;
  postInterviewScore: number;
  totalScore: number;
  confidenceLevel: number;   // 0–100
  aiSummary: string;
  strengthSummary: string;
  concernSummary: string;
  openQuestions: string;
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
}

// ─── Candidate evaluation ─────────────────────────────────────────────────────

/**
 * Evaluates a candidate's application answers against the job's scoring config
 * using an LLM via OpenRouter.
 *
 * Returns structured data that maps directly onto the CandidateScore entity.
 */
export async function evaluateCandidate(
  input: EvaluateCandidateInput
): Promise<EvaluateCandidateResult> {
  const client = createClient();

  // Only score dimensions that apply to the current phase
  const applicableDimensions = input.evaluationDimensions.filter(
    (d) => d.phase === 'both' || d.phase === input.phase
  );

  const dimensionList = applicableDimensions
    .map(
      (d, i) =>
        `${i + 1}. "${d.name}" (id: ${d.id}, weight: ${d.weight}%, max score: ${input.totalScaleMax})\n` +
        `   Description: ${d.description}\n` +
        (d.scoringGuidance ? `   Guidance: ${d.scoringGuidance}\n` : '')
    )
    .join('\n');

  const answerList = input.applicationAnswers
    .map((a, i) => `Q${i + 1}: ${a.questionText}\nA${i + 1}: ${a.answerText ?? '(no answer provided)'}`)
    .join('\n\n');

  const systemPrompt = `You are an objective, senior HR evaluation assistant for a hiring platform called TalentNet.
Your task is to evaluate a job candidate's application answers against a structured scoring rubric.
You must respond with valid JSON only — no markdown, no explanation outside the JSON.`;

  const userPrompt = `## Job
Title: ${input.jobTitle}
Description: ${input.jobDescription}
${input.requiredSkills?.length ? `Required skills: ${input.requiredSkills.join(', ')}` : ''}

## Candidate${input.candidateName ? `: ${input.candidateName}` : ''}

## Application Answers
${answerList}

## Scoring Rubric (${input.phase.replace('_', '-')} phase)
Score each dimension on a scale of 0 to ${input.totalScaleMax}.
${dimensionList}

## Instructions
Evaluate the candidate based ONLY on the information provided in their answers.
Be objective and consistent. Do not infer information that is not present.

Respond with this exact JSON shape:
{
  "dimensionScores": [
    {
      "dimensionId": "<id>",
      "dimensionName": "<name>",
      "rawScore": <number 0–${input.totalScaleMax}>,
      "weight": <weight as percentage number>,
      "reasoning": "<1-2 sentence justification>"
    }
  ],
  "confidenceLevel": <number 0–100 reflecting how much of the rubric could be assessed from the answers>,
  "aiSummary": "<2-3 sentence overall assessment>",
  "strengthSummary": "<bullet-point list of key strengths, one per line>",
  "concernSummary": "<bullet-point list of concerns or gaps, one per line, or 'None identified'>",
  "openQuestions": "<bullet-point list of follow-up questions for interviewers, one per line, or 'None'>",
  "recommendation": "<one of: strong_yes | yes | maybe | no | strong_no>"
}`;

  const response = await client.chat.completions.create({
    model: MODEL(),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,  // low temperature for consistent structured output
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('OpenRouter returned an empty response');

  let parsed: ReturnType<typeof parseEvaluationResponse>;
  try {
    parsed = parseEvaluationResponse(JSON.parse(raw), applicableDimensions, input.totalScaleMax);
  } catch (err) {
    throw new Error(`Failed to parse AI evaluation response: ${(err as Error).message}`);
  }

  return parsed;
}

function parseEvaluationResponse(
  data: Record<string, unknown>,
  dimensions: EvaluationDimensionInput[],
  totalScaleMax: number
): EvaluateCandidateResult {
  const rawScores = data.dimensionScores as Array<{
    dimensionId: string;
    dimensionName: string;
    rawScore: number;
    weight: number;
    reasoning: string;
  }>;

  if (!Array.isArray(rawScores)) {
    throw new Error('dimensionScores must be an array');
  }

  const dimensionScores: DimensionScore[] = rawScores.map((s) => {
    const dim = dimensions.find((d) => d.id === s.dimensionId);
    const weight = dim?.weight ?? s.weight ?? 0;
    const rawScore = Math.max(0, Math.min(totalScaleMax, Number(s.rawScore) || 0));
    return {
      dimensionId: s.dimensionId,
      dimensionName: s.dimensionName ?? dim?.name ?? '',
      rawScore,
      weightedScore: parseFloat(((rawScore * weight) / 100).toFixed(4)),
      weight,
      phase: dim?.phase ?? 'both',
      reasoning: String(s.reasoning ?? ''),
    };
  });

  // Roll up phase scores
  let preInterviewScore = 0;
  let postInterviewScore = 0;

  for (const score of dimensionScores) {
    if (score.phase === 'pre_interview' || score.phase === 'both') {
      preInterviewScore += score.weightedScore;
    }
    if (score.phase === 'post_interview' || score.phase === 'both') {
      postInterviewScore += score.weightedScore;
    }
  }

  const totalScore = parseFloat((preInterviewScore + postInterviewScore).toFixed(2));
  preInterviewScore = parseFloat(preInterviewScore.toFixed(2));
  postInterviewScore = parseFloat(postInterviewScore.toFixed(2));

  const validRecommendations = ['strong_yes', 'yes', 'maybe', 'no', 'strong_no'] as const;
  const recommendation = validRecommendations.includes(data.recommendation as never)
    ? (data.recommendation as EvaluateCandidateResult['recommendation'])
    : 'maybe';

  return {
    dimensionScores,
    preInterviewScore,
    postInterviewScore,
    totalScore,
    confidenceLevel: Math.max(0, Math.min(100, Number(data.confidenceLevel) || 50)),
    aiSummary: String(data.aiSummary ?? ''),
    strengthSummary: String(data.strengthSummary ?? ''),
    concernSummary: String(data.concernSummary ?? ''),
    openQuestions: String(data.openQuestions ?? ''),
    recommendation,
  };
}

// ─── Job description generation ───────────────────────────────────────────────

export interface GenerateJobDescriptionInput {
  title: string;
  department?: string;
  employmentType?: string;
  experienceLevel?: string;
  requiredSkills?: string[];
  additionalContext?: string;
}

export interface GenerateJobDescriptionResult {
  summary: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
}

/**
 * Generates a structured job description draft from minimal HR-provided input.
 */
export async function generateJobDescription(
  input: GenerateJobDescriptionInput
): Promise<GenerateJobDescriptionResult> {
  const client = createClient();

  const userPrompt = `Generate a professional job description for the following role:

Title: ${input.title}
${input.department ? `Department: ${input.department}` : ''}
${input.employmentType ? `Employment type: ${input.employmentType}` : ''}
${input.experienceLevel ? `Level: ${input.experienceLevel}` : ''}
${input.requiredSkills?.length ? `Key skills: ${input.requiredSkills.join(', ')}` : ''}
${input.additionalContext ? `Additional context: ${input.additionalContext}` : ''}

Respond with this exact JSON shape:
{
  "summary": "<2-3 sentence role overview>",
  "responsibilities": ["<responsibility 1>", "<responsibility 2>", ...],
  "requirements": ["<requirement 1>", "<requirement 2>", ...],
  "niceToHave": ["<nice-to-have 1>", ...]
}`;

  const response = await client.chat.completions.create({
    model: MODEL(),
    messages: [
      {
        role: 'system',
        content:
          'You are an experienced HR copywriter. Write clear, inclusive, and accurate job descriptions. Respond with valid JSON only.',
      },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error('OpenRouter returned an empty response');

  const parsed = JSON.parse(raw) as Record<string, unknown>;

  return {
    summary: String(parsed.summary ?? ''),
    responsibilities: Array.isArray(parsed.responsibilities)
      ? parsed.responsibilities.map(String)
      : [],
    requirements: Array.isArray(parsed.requirements) ? parsed.requirements.map(String) : [],
    niceToHave: Array.isArray(parsed.niceToHave) ? parsed.niceToHave.map(String) : [],
  };
}
