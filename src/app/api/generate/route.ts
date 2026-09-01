import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MODEL = 'qwen/qwen3.6-27b';

type WritingProfile = Record<string, unknown>;

async function groqCall(
  messages: { role: string; content: string }[],
  temperature = 0.82,
  // temperature = 0.72,
  max_tokens = 900,
) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: 'none',
      messages,
      temperature,
      max_tokens,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Groq generation error:', data);
    throw new Error(data?.error?.message || 'Generation failed');
  }

  return data.choices?.[0]?.message?.content?.trim() || '';
}

function buildWritingProfileBlock(profile: WritingProfile): string {
  if (!profile || Object.keys(profile).length === 0) {
    return 'No writing profile is available. Follow the dump naturally.';
  }

  const lines: string[] = [];
  const add = (label: string, key: string) => {
    const value = profile[key];
    if (typeof value === 'string' && value.trim()) lines.push(`${label}: ${value}`);
  };
  const addArray = (label: string, key: string) => {
    const value = profile[key];
    if (Array.isArray(value) && value.length) {
      lines.push(`${label}: ${value.join(', ')}`);
    }
  };

  add('Formality', 'formality');
  add('Sentence style', 'sentence_style');
  add('Natural thought flow', 'thought_flow'); //we are asking user for dump;this is debatable
  add('Explanation style', 'explanation_style');
  add('Emotional expression', 'emotional_expression');
  add('Confidence expression', 'confidence_expression');
  addArray('Hedging patterns', 'hedging_patterns');
  addArray('Voice markers', 'voice_markers');
  add('Vocabulary style', 'vocabulary_style');
  add('Paragraph style', 'paragraph_style');
  add('Punctuation style', 'punctuation_style');//i think we can make this more generalized rather than depending on dump; formatting and capitilzation should be generalized
  add('Capitalization style', 'capitalization_style');
  add('Contraction style', 'contraction_style');
  add('Opinion/stance style', 'stance');
  addArray('Explicit writing preferences', 'explicit_preferences');

  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const { dump, userId, previousOutput, lastRejectionReason } = await req.json();

    if (!dump?.trim() || !userId) {
      return NextResponse.json({ error: 'Missing dump or userId' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('writing_profile')
      .eq('user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Failed to load writing profile' }, { status: 500 });
    }

    const writingProfile = (profile?.writing_profile as WritingProfile) || {};

    const systemPrompt = `You are a ghostwriter for LinkedIn.

Your job is very narrow:
Turn the user's raw thought dump into a readable LinkedIn post while preserving the person's natural way of expressing themselves.

There are two different sources of information:

1. WRITING PROFILE = HOW the person naturally communicates.
2. RAW DUMP = WHAT the person is saying right now.

THE RAW DUMP IS THE ONLY SOURCE OF CONTENT.

The writing profile is STYLE ONLY. Never use it to add facts, examples, projects, technologies, people, experiences, opinions, achievements, interests, emotions, or topics that are not present in the dump.

If the writing profile mentions a profession, domain, technology, project, interest, audience, or anything else about the person, IGNORE that information as content. It exists only to help you understand the person's communication style.

Do not manufacture specificity.
Do not make the thought more impressive.
Do not make the person sound more expert than the dump supports.
Do not turn a small observation into a large thought-leadership post.
Do not turn an observation into advice unless the dump contains advice.
Do not invent a story, setting, dialogue, example, result, lesson, conclusion, or emotional resolution.

The goal is not maximum engagement. The goal is: 'This sounds like something this person would actually say.'`;

    const userMessage = `WRITING PROFILE — STYLE ONLY
${buildWritingProfileBlock(writingProfile)}

IMPORTANT: None of the information above is content. Do not introduce it into the post unless the same information is explicitly present in the raw dump.

RAW DUMP — CONTENT SOURCE
${dump.trim()}

${previousOutput ? `PREVIOUS VERSION
${previousOutput}

The previous version was not accepted. Keep only what genuinely worked. Revise it using the current dump as the source of truth. Do not add new content.` : ''}

${lastRejectionReason ? `USER'S CURRENT FEEDBACK
${lastRejectionReason}

Fix this specific issue without adding content that is not in the dump.` : ''}

WRITING RULES
- Preserve every fact, claim, and opinion from the dump. Never invent.
- Preserve the person's level of certainty — "i think" stays "I think"
- Clean grammar and remove repetition
- Organize into readable paragraphs with natural flow
- You MAY restructure for narrative clarity — the dump order is not sacred
- You MAY write a proper opening line that draws from the dump's core idea
- You MAY write a closing thought if the dump has a natural conclusion
- Always add 3-5 relevant hashtags at the end
- Do not use corporate filler: "game-changer", "leverage", "delve", "excited to share"
- Do not start with "I" as the first word
- Do not add bullet points unless the dump is clearly a list
- Length: match the richness of the dump. A detailed dump deserves a full post.


Before writing, silently check:
1. Is every factual/content claim in the post supported by the dump?
2. Did I accidentally use the writing profile as content?
3. Did I add a lesson, example, setting, technology, project, or conclusion that the person did not give me?
4. Does the length match the amount of thought in the dump?
5. Does this sound like a person expressing their own thought rather than a LinkedIn ghostwriter performing 'LinkedIn'? 

Output ONLY the post.`;

    const post = await groqCall(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      0.72,
      900
    );

    if (!post) {
      return NextResponse.json({ error: 'No post generated' }, { status: 500 });
    }

    return NextResponse.json({ post });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Something went wrong' },
      { status: 500 }
    );
  }
}
