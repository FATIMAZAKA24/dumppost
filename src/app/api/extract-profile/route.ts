import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MODEL = 'openai/gpt-oss-120b';

const writingProfileSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    formality: { type: 'string' },
    sentence_style: { type: 'string' },
    thought_flow: { type: 'string' },
    explanation_style: { type: 'string' },
    emotional_expression: { type: 'string' },
    confidence_expression: { type: 'string' },
    hedging_patterns: { type: 'array', items: { type: 'string' } },
    voice_markers: { type: 'array', items: { type: 'string' } },
    vocabulary_style: { type: 'string' },
    paragraph_style: { type: 'string' },
    punctuation_style: { type: 'string' },
    capitalization_style: { type: 'string' },
    contraction_style: { type: 'string' },
    stance: { type: 'string' },
    explicit_preferences: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'formality',
    'sentence_style',
    'thought_flow',
    'explanation_style',
    'emotional_expression',
    'confidence_expression',
    'hedging_patterns',
    'voice_markers',
    'vocabulary_style',
    'paragraph_style',
    'punctuation_style',
    'capitalization_style',
    'contraction_style',
    'stance',
    'explicit_preferences',
  ],
};

const profileSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    professional_context: {
      type: 'object',
      additionalProperties: false,
      properties: {
        domain: { type: 'string' },
        role: { type: 'string' },
      },
      required: ['domain', 'role'],
    },
    writing_profile: writingProfileSchema,
  },
  required: ['professional_context', 'writing_profile'],
};

async function extractProfile(conversation: string) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: 'low',
      temperature: 0.2,
      max_tokens: 1800,
      messages: [
        {
          role: 'system',
          content: `You are a writing-profile analyst.

Your job is to learn HOW a person naturally communicates, not to decide WHAT they should post about.

There are two separate outputs:

1. professional_context: basic identity information only. This is stored for the user's profile but is NOT generation content.
2. writing_profile: observable communication behavior that can help another writer imitate the person's natural way of expressing thoughts.

IMPORTANT:
- Do not infer personality types, intelligence, confidence as a personality trait, or psychological characteristics unless they are directly expressed as writing behavior.
- Do not turn topics mentioned by the person into writing-style attributes.
- Do not put technologies, projects, employers, industries, interests, or career goals into voice_markers or vocabulary_style unless they are genuinely linguistic habits. Domain vocabulary is NOT voice.
- Do not invent phrases the person did not use.
- Question 6 is the strongest voice evidence because it is explicitly a free-writing sample. Use questions 1-5 mainly to corroborate patterns.
- If evidence is weak, say so rather than guessing.
- The writing profile should describe observable behavior in plain language, not abstract labels.
- voice_markers and hedging_patterns should contain short phrases actually present in the answers, not invented examples.
- Keep arrays short: maximum 5 items each.

The writing profile will later be given to a separate generation call. It must answer: 'How should this person sound?' It must NOT answer: 'What should this person talk about?'`,
        },
        {
          role: 'user',
          content: `Analyze these onboarding answers.

${conversation}

QUESTION 6 IS THE PRIMARY VOICE SAMPLE.
Do not copy its topic into the profile. Study its language, rhythm, phrasing, punctuation, and naturalness.

For every writing_profile field, use only evidence supported by the answers. Prefer a concrete behavioral description over a one-word label.`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'dumppost_profile',
          strict: true,
          schema: profileSchema,
        },
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Groq profile extraction error:', data);
    throw new Error(data?.error?.message || 'Profile extraction failed');
  }

  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Groq returned no profile content');

  return JSON.parse(raw);
}

export async function POST(req: NextRequest) {
  try {
    const { userId, answers, userType } = await req.json();

    if (!userId || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: 'Missing onboarding data' }, { status: 400 });
    }

    const employedQuestions = [
      "What are you working on right now? Explain it like you're texting a friend — don't make it sound impressive.",
      "What's the most interesting thing you've figured out recently? Could be tiny.",
      "What's been annoying you or slowing you down lately?",
      "What's an opinion you have about your field that people might push back on?",
      "What do you want people to think when they read your posts? Be honest.",
      "Write a short paragraph the way you'd actually text or explain something to someone. Don't try to sound professional. Don't worry about grammar. Just write naturally.",
    ];

    const studentQuestions = [
      "What are you learning right now? Explain it like you're texting a friend.",
      "What's something in your field that surprised or confused you recently?",
      "What's been the hardest part of where you are right now?",
      "What's an opinion you have that people in your field might disagree with?",
      "Who do you want reading your posts and what should they think?",
      "Write a short paragraph the way you'd actually text or explain something to someone. Don't try to sound professional. Don't worry about grammar. Just write naturally.",
    ];

    const jobseekerQuestions = [
      "What kind of work do you actually want to be doing? Not the polished answer — the real one.",
      "What's the most interesting thing you've built or worked on? Explain it simply.",
      "What's been the hardest part of your search so far?",
      "What's something about your field that people misunderstand?",
      "What do you want people to think when they read your posts?",
      "Write a short paragraph the way you'd actually text or explain something to someone. Don't try to sound professional. Don't worry about grammar. Just write naturally.",
    ];

    const questions =
      userType === 'student' ? studentQuestions :
      userType === 'jobseeker' ? jobseekerQuestions :
      employedQuestions;

    const conversation = answers
      .map((answer: string, index: number) => `QUESTION ${index + 1}: ${questions[index] || ''}\nANSWER: ${answer}`)
      .join('\n\n');

    const extracted = await extractProfile(conversation);

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: userId,
        onboarding_answers: answers,
        onboarding_questions: questions,
        user_type: userType,
        professional_context: extracted.professional_context,
        writing_profile: extracted.writing_profile,
        profile_version: 3,
        // Clear the old V2 profile so it cannot accidentally be used later.
        voice_dna: {},
        thinking_dna: {},
        linkedin_dna: {},
        editing_rules: [],
        avoid_rules: [],
        memory: {},
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Supabase profile upsert error:', error);
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      professional_context: extracted.professional_context,
      writing_profile: extracted.writing_profile,
    });
  } catch (err) {
    console.error('Extract profile error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to extract profile' },
      { status: 500 }
    );
  }
}
