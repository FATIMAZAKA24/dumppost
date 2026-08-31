import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const employedQuestions = [
  "What are you working on right now? Explain it like you're texting a friend — don't make it sound impressive.",
  "What's the most interesting thing you've figured out recently? Could be tiny.",
  "What's been annoying you or slowing you down lately?",
  "What's an opinion you have about your field that people might push back on?",
  "What do you want people to think when they read your posts? Be honest.",
  "Write me two or three sentences the way you'd normally write — could be about anything at all.",
];

const studentQuestions = [
  "What are you learning right now? Explain it like you're texting a friend.",
  "What's something in your field that surprised or confused you recently?",
  "What's been the hardest part of where you are right now?",
  "What's an opinion you have that people in your field might disagree with?",
  "Who do you want reading your posts and what should they think?",
  "Write me two or three sentences the way you'd normally write — could be about anything at all.",
];

const jobseekerQuestions = [
  "What kind of work do you actually want to be doing? Not the polished answer — the real one.",
  "What's the most interesting thing you've built or worked on? Explain it simply.",
  "What's been the hardest part of your search so far?",
  "What's something about your field that people misunderstand?",
  "What do you want people to think when they read your posts?",
  "Write me two or three sentences the way you'd normally write — could be about anything at all.",
];

const profileSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    domain: { type: 'string' },
    role: { type: 'string' },
    project_type: { type: 'string' },
    baseline_confidence: { type: 'string' },
    enthusiasm_level: { type: 'string' },
    technical_depth: { type: 'string' },
    explanation_style: { type: 'string' },
    emotional_honesty: { type: 'string' },
    problem_solving_style: { type: 'string' },
    vulnerability_level: { type: 'string' },
    audience: { type: 'string' },
    posting_goal: { type: 'string' },
    desired_perception: { type: 'string' },
    passion_areas: { type: 'string' },
    sentence_rhythm: { type: 'string' },
    structure_preference: { type: 'string' },
    real_vocabulary: { type: 'string' },
    explicit_preferences: { type: 'string' },
    personality_type: { type: 'string' },
    self_awareness: { type: 'string' },
    ai_tool_relationship: { type: 'string' },
  },
  required: [
    'domain', 'role', 'project_type', 'baseline_confidence', 'enthusiasm_level',
    'technical_depth', 'explanation_style', 'emotional_honesty', 'problem_solving_style',
    'vulnerability_level', 'audience', 'posting_goal', 'desired_perception',
    'passion_areas', 'sentence_rhythm', 'structure_preference', 'real_vocabulary',
    'explicit_preferences', 'personality_type', 'self_awareness', 'ai_tool_relationship',
  ],
};

export async function POST(req: NextRequest) {
  try {
    const { userId, answers, userType } = await req.json();

    if (!userId || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: 'Missing userId or onboarding answers' }, { status: 400 });
    }

    const questions =
      userType === 'student' ? studentQuestions :
      userType === 'jobseeker' ? jobseekerQuestions :
      employedQuestions;

    const conversation = answers
      .map((answer: string, index: number) => `Q: ${questions[index] || `Question ${index + 1}`}\nA: ${answer}`)
      .join('\n\n');

    const groqResponse = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are DumpPost's user-profile extractor.

Read the user's onboarding answers holistically and extract a compact, stable profile that will be reused every time a LinkedIn post is generated.

Extract only information that is supported by the answers. These are profile attributes, not instructions for writing a specific post. Do not invent facts. If something is unclear, return "unknown".

The most important signal for writing style is the user's own wording, especially the final free-writing answer. Do not confuse the length of an onboarding answer with their normal writing length.

Return ONLY the requested JSON object.`,
          },
          {
            role: 'user',
            content: `Extract the following profile attributes from these onboarding answers.

ONBOARDING:
${conversation}

ATTRIBUTE DEFINITIONS:
- domain: field or industry
- role: job title, professional role, or student status
- project_type: kind of technical/work activity they commonly do
- baseline_confidence: high, medium, or low based on how confidently they describe their work
- enthusiasm_level: high, medium, or low based on genuine excitement in their answers
- technical_depth: high, medium, or low based on the technical specificity of their language
- explanation_style: simple, technical, story-driven, analytical, conversational, etc.
- emotional_honesty: high, medium, or low based on how openly they discuss uncertainty/frustration/emotion
- problem_solving_style: how they naturally approach problems
- vulnerability_level: high, medium, or low
- audience: who they want reading their posts
- posting_goal: what they want LinkedIn to achieve for them
- desired_perception: how they want to be perceived
- passion_areas: subjects they genuinely care about
- sentence_rhythm: short-punchy, long-flowing, or mixed
- structure_preference: how they naturally develop an idea
- real_vocabulary: distinctive words/phrases they actually use; do not substitute polished synonyms
- explicit_preferences: explicit requests or dislikes about their content
- personality_type: analytical, storyteller, straight-shooter, reflective, etc.; only if supported by the answers
- self_awareness: how aware they appear to be of their work and communication style
- ai_tool_relationship: how comfortable/familiar they appear to be with AI tools

Return all 21 attributes.`,
          },
        ],
        temperature: 0.2,
        reasoning_effort: 'low',
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'user_profile',
            strict: true,
            schema: profileSchema,
          },
        },
        max_tokens: 1200,
      }),
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error('Groq profile extraction error:', data);
      return NextResponse.json({ error: 'Profile extraction failed', details: data }, { status: 500 });
    }

    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      console.error('Groq returned no profile content:', JSON.stringify(data));
      return NextResponse.json({ error: 'No profile extracted' }, { status: 500 });
    }

    const signals = JSON.parse(raw);

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: userId,
        ...signals,
        onboarding_answers: answers,
        onboarding_questions: questions,
        user_type: userType,
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Supabase profile save error:', error);
      return NextResponse.json({ error: 'Failed to save profile', details: error }, { status: 500 });
    }

    return NextResponse.json({ success: true, signals });
  } catch (err) {
    console.error('Extract profile error:', err);
    return NextResponse.json({ error: 'Failed to extract profile' }, { status: 500 });
  }
}
