import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function groq(messages: { role: string; content: string }[], temperature = 0.3) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature,
      max_tokens: 1000,
    }),
  });
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || '';
  return raw.replace(/```json|```/g, '').trim();
}

function parseJSON(raw: string, fallback: object) {
  try { return JSON.parse(raw); }
  catch { return fallback; }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, answers, userType } = await req.json();

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

    const questions =
      userType === 'student' ? studentQuestions :
      userType === 'jobseeker' ? jobseekerQuestions :
      employedQuestions;

    const conversation = answers
      .map((a: string, i: number) => `Q: ${questions[i]}\nA: ${a}`)
      .join('\n\n');

    // ── Run both extractions in parallel ──
    const [voiceRaw, linkedinRaw] = await Promise.all([

      // Call 1 — Voice DNA + Thinking DNA
      groq([
        {
          role: 'system',
          content: `You are a writing analyst. Extract observable writing behavior from a person's natural writing samples. Return ONLY raw JSON — no markdown, no backticks, no explanation.`,
        },
        {
          role: 'user',
          content: `Analyze these onboarding answers and extract how this person actually writes.

Pay special attention to question 6 — it is a pure writing sample with no topic constraint, giving the clearest voice signal.

WRITING SAMPLES:
${conversation}

CRITICAL: You are extracting observable behavior, not personality. Do not infer confidence, enthusiasm, or personality type. Only extract things you can directly observe in the text.

Return this exact JSON:
{
  "voice_dna": {
    "sentence_length": "short | medium | long",
    "paragraph_style": "single-line | two-line | long-blocks | mixed",
    "favorite_openings": ["up to 4 actual phrases they used to start sentences"],
    "favorite_transitions": ["up to 4 actual transition words/phrases they used"],
    "hedging_words": ["words like 'kind of', 'maybe', 'I think' they actually used"],
    "confidence_markers": ["words like 'definitely', 'clearly' they actually used — empty array if none"],
    "punctuation_style": "minimal | heavy | dash-heavy | ellipsis-heavy",
    "emoji_usage": "never | rare | moderate | frequent",
    "capitalization": "normal | all-lowercase | emphatic-caps",
    "formality": "very-low | low | medium | high",
    "humor_style": "none | dry | self-deprecating | warm",
    "favorite_words": ["up to 6 distinctive words they actually used"],
    "swearing": "never | rare | moderate",
    "question_frequency": "never | rare | moderate | frequent",
    "list_usage": "never | rare | moderate | frequent",
    "intensity": "understated | balanced | expressive",
    "vocabulary_complexity": "simple | mixed | complex",
    "contractions_usage": "always | sometimes | never"
  },
  "thinking_dna": {
    "primary_pattern": "one of: observation→analysis→question | story→mistake→lesson | opinion→evidence→conclusion | experience→reflection→advice | question→exploration→open-end",
    "starts_with": "observation | story | opinion | question | fact | personal-experience",
    "develops_into": "analysis | lesson | evidence | exploration | reflection",
    "ends_with": "question | conclusion | advice | open-thought | call-to-action",
    "thinking_style": "linear | exploratory | contrarian | reflective | analytical",
    "abstraction_level": "concrete-examples | mixed | abstract-principles"
  }
}`,
        },
      ]),

      // Call 2 — LinkedIn DNA
      groq([
        {
          role: 'system',
          content: `You are a LinkedIn content strategist. Extract someone's LinkedIn content preferences from their onboarding answers. Return ONLY raw JSON — no markdown, no backticks, no explanation.`,
        },
        {
          role: 'user',
          content: `Extract this person's LinkedIn content strategy from their onboarding answers.

ONBOARDING:
${conversation}

Return this exact JSON:
{
  "linkedin_dna": {
    "preferred_post_types": ["story", "reflection", "opinion", "lesson", "tutorial", "observation", "announcement", "behind-the-scenes"],
    "hook_style": "curiosity | bold-statement | question | number | story-open | contradiction",
    "cta_style": "question | none | soft-cta | direct-ask",
    "hashtag_usage": "none | minimal | moderate | heavy",
    "hashtag_style": "broad | niche | mixed",
    "preferred_length": "short | medium | long",
    "uses_line_breaks": true,
    "uses_bullet_points": false,
    "uses_bold": false,
    "audience": "who they want reading their posts",
    "posting_goal": "what they want to achieve",
    "desired_perception": "how they want to be seen"
  }
}`,
        },
      ]),
    ]);

    const voiceData = parseJSON(voiceRaw, { voice_dna: {}, thinking_dna: {} });
    const linkedinData = parseJSON(linkedinRaw, { linkedin_dna: {} });

    // ── Save everything to user_profiles ──
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: userId,
        // New V2 JSON columns
        voice_dna: voiceData.voice_dna || {},
        thinking_dna: voiceData.thinking_dna || {},
        linkedin_dna: linkedinData.linkedin_dna || {},
        editing_rules: [],
        avoid_rules: [],
        memory: {
          recent_topics: [],
          recent_hooks: [],
          recent_hashtags: [],
          recent_post_types: [],
          recent_openings: [],
          post_count: 0,
        },
        // Keep raw answers for generate prompt
        onboarding_answers: answers,
        onboarding_questions: questions,
        user_type: userType,
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      voice_dna: voiceData.voice_dna,
      thinking_dna: voiceData.thinking_dna,
      linkedin_dna: linkedinData.linkedin_dna,
    });

  } catch (err) {
    console.error('Extract profile error:', err);
    return NextResponse.json({ error: 'Failed to extract profile' }, { status: 500 });
  }
}