import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// async function groqCall(
//   messages: { role: string; content: string }[],
//   temperature = 0.72,
//   max_tokens = 1200
// ) {
//   const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       //model: 'llama-3.3-70b-versatile',
//       model: 'openai/gpt-oss-120b',
//       messages,
//       temperature,
//       max_tokens,
//     }),
//   });
//   const data = await res.json();
//   return data.choices?.[0]?.message?.content?.trim() || '';
// }

async function groqCall(
  messages: { role: string; content: string }[],
  temperature = 0.72,
  max_tokens = 1200
) {
  const res = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages,
        temperature,
        max_tokens,
        include_reasoning: false,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.error('Groq API error:', data);

    throw new Error(
      data?.error?.message ||
      `Groq API request failed with status ${res.status}`
    );
  }

  const choice = data.choices?.[0];

  console.log('Groq response:', {
    finish_reason: choice?.finish_reason,
    content: choice?.message?.content,
    reasoning: choice?.message?.reasoning,
    usage: data.usage,
  });

  const content = choice?.message?.content?.trim();

  if (!content) {
    throw new Error(
      `Groq returned no generated content. Finish reason: ${
        choice?.finish_reason || 'unknown'
      }`
    );
  }

  return content;
}

// ── Anti-AI word filter ──
const AI_WORDS = [
  'journey', 'delve', 'landscape', 'leverage', 'foster',
  'game-changing', 'game changer', 'more than ever', "in today's world",
  'transformative', "it's worth noting", "it's important to remember",
  'navigating', 'groundbreaking', 'revolutionary', 'seamless', 'robust',
  'cutting-edge', 'excited to share', 'humbled', 'thrilled', 'delighted',
  'powerful tool', 'unlock', 'unleash', 'supercharge', 'skyrocket',
  'dive deep', 'deep dive', 'at the end of the day', 'move the needle',
  'circle back', 'synergy', 'impactful', 'actionable', 'holistic',
];

function applyAntiAIFilter(text: string): string {
  let result = text;
  for (const word of AI_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(result)) {
      // Flag it — authenticity checker will handle rewrites
      result = result.replace(regex, `[FLAG:${word}]`);
    }
  }
  return result;
}

function hasFlags(text: string): boolean {
  return text.includes('[FLAG:');
}

function stripFlags(text: string): string {
  return text.replace(/\[FLAG:[^\]]+\]/gi, (match) => {
    // Remove the flag wrapper, keep the word — authenticity checker rewrites it
    return match.replace(/\[FLAG:([^\]]+)\]/gi, '$1');
  });
}

// ── Post-type classifier ──
async function classifyDump(dump: string) {
  const raw = await groqCall([
    {
      role: 'system',
      content: `You are a content classifier. Return ONLY raw JSON — no markdown, no backticks.`,
    },
    {
      role: 'user',
      content: `Classify this raw thought dump:

"${dump}"

Post types: story | lesson | opinion | reflection | tutorial | observation | announcement | behind-the-scenes

IMPORTANT tense rule: If the dump uses present tense or does not explicitly say something is finished/past, classify it as ongoing/present. Do not infer past tense.

Return:
{
  "post_type": "one of the types above",
  "core_message": "one sentence — what is the person actually trying to say? Use the same tense as the dump.",
  "core_emotion": "one word — what emotion is underneath this dump?",
  "suggested_structure": "observation→analysis→question | story→conflict→lesson | opinion→evidence→conclusion | experience→reflection→advice | question→exploration→open-end",
  "hook_angle": "one sentence — what would make someone stop scrolling for this specific post? Do not use past tense unless the dump explicitly does."
}`,
    },
  ], 0.2, 300);

  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    return {
      post_type: 'observation',
      core_message: dump.slice(0, 100),
      core_emotion: 'neutral',
      suggested_structure: 'observation→analysis→question',
      hook_angle: null,
    };
  }
}

// ── Build voice DNA block for prompt ──
function buildVoiceBlock(voice: Record<string, unknown>): string {
  if (!voice || Object.keys(voice).length === 0) return 'No voice data yet.';
  return [
    voice.sentence_length && `Sentence length: ${voice.sentence_length}`,
    voice.paragraph_style && `Paragraph style: ${voice.paragraph_style}`,
    voice.formality && `Formality: ${voice.formality}`,
    voice.punctuation_style && `Punctuation: ${voice.punctuation_style}`,
    voice.emoji_usage && `Emoji usage: ${voice.emoji_usage}`,
    voice.capitalization && `Capitalization: ${voice.capitalization}`,
    voice.humor_style && `Humor: ${voice.humor_style}`,
    voice.intensity && `Intensity: ${voice.intensity}`,
    voice.contractions_usage && `Contractions: ${voice.contractions_usage}`,
    voice.vocabulary_complexity && `Vocabulary: ${voice.vocabulary_complexity}`,
    voice.swearing && `Swearing: ${voice.swearing}`,
    voice.question_frequency && `Questions: ${voice.question_frequency}`,
    voice.list_usage && `Lists: ${voice.list_usage}`,
    Array.isArray(voice.favorite_openings) && voice.favorite_openings.length > 0 &&
      `Favorite openings: ${(voice.favorite_openings as string[]).join(', ')}`,
    Array.isArray(voice.favorite_transitions) && voice.favorite_transitions.length > 0 &&
      `Favorite transitions: ${(voice.favorite_transitions as string[]).join(', ')}`,
    Array.isArray(voice.favorite_words) && voice.favorite_words.length > 0 &&
      `Favorite words: ${(voice.favorite_words as string[]).join(', ')}`,
    Array.isArray(voice.hedging_words) && voice.hedging_words.length > 0 &&
      `Hedging words they use: ${(voice.hedging_words as string[]).join(', ')}`,
  ].filter(Boolean).join('\n');
}

// ── Build thinking DNA block for prompt ──
function buildThinkingBlock(thinking: Record<string, unknown>): string {
  if (!thinking || Object.keys(thinking).length === 0) return 'No thinking pattern data yet.';
  return [
    thinking.primary_pattern && `Thinking pattern: ${thinking.primary_pattern}`,
    thinking.thinking_style && `Thinking style: ${thinking.thinking_style}`,
    thinking.abstraction_level && `Abstraction level: ${thinking.abstraction_level}`,
    thinking.starts_with && `Posts start with: ${thinking.starts_with}`,
    thinking.develops_into && `Posts develop into: ${thinking.develops_into}`,
    thinking.ends_with && `Posts end with: ${thinking.ends_with}`,
  ].filter(Boolean).join('\n');
}

// ── Build LinkedIn DNA block for prompt ──
function buildLinkedInBlock(linkedin: Record<string, unknown>): string {
  if (!linkedin || Object.keys(linkedin).length === 0) return 'No LinkedIn preferences yet.';
  return [
    Array.isArray(linkedin.preferred_post_types) && linkedin.preferred_post_types.length > 0 &&
      `Preferred post types: ${(linkedin.preferred_post_types as string[]).join(', ')}`,
    linkedin.hook_style && `Hook style: ${linkedin.hook_style}`,
    linkedin.cta_style && `CTA style: ${linkedin.cta_style}`,
    linkedin.hashtag_usage && `Hashtag usage: ${linkedin.hashtag_usage}`,
    linkedin.preferred_length && `Preferred length: ${linkedin.preferred_length}`,
    linkedin.uses_line_breaks !== undefined && `Uses line breaks: ${linkedin.uses_line_breaks}`,
    linkedin.uses_bullet_points !== undefined && `Uses bullet points: ${linkedin.uses_bullet_points}`,
    linkedin.audience && `Target audience: ${linkedin.audience}`,
    linkedin.posting_goal && `Posting goal: ${linkedin.posting_goal}`,
    linkedin.desired_perception && `Desired perception: ${linkedin.desired_perception}`,
  ].filter(Boolean).join('\n');
}

// ── Build memory block for prompt ──
function buildMemoryBlock(memory: Record<string, unknown>): string {
  if (!memory || Object.keys(memory).length === 0) return '';
  const lines = [
    Array.isArray(memory.recent_topics) && memory.recent_topics.length > 0 &&
      `Recent topics (avoid repeating): ${(memory.recent_topics as string[]).slice(0, 5).join(', ')}`,
    Array.isArray(memory.recent_hooks) && memory.recent_hooks.length > 0 &&
      `Recent hooks (avoid repeating): ${(memory.recent_hooks as string[]).slice(0, 3).join(', ')}`,
    Array.isArray(memory.recent_hashtags) && memory.recent_hashtags.length > 0 &&
      `Recent hashtags (vary these): ${(memory.recent_hashtags as string[]).slice(0, 5).join(', ')}`,
    Array.isArray(memory.recent_post_types) && memory.recent_post_types.length > 0 &&
      `Recent post types: ${(memory.recent_post_types as string[]).slice(0, 3).join(', ')}`,
  ].filter(Boolean);

  return lines.length > 0 ? lines.join('\n') : '';
}

export async function POST(req: NextRequest) {
  try {
    const { dump, userId, previousOutput } = await req.json();

    // ── Fetch all user data in parallel ──
    const [profileRes, userRes, rejectionsRes, editsRes] = await Promise.all([
      supabaseAdmin.from('user_profiles').select('*').eq('user_id', userId).single(),
      supabaseAdmin.from('users').select('name, user_type').eq('id', userId).single(),
      supabaseAdmin
        .from('interactions')
        .select('rejection_reason')
        .eq('user_id', userId)
        .eq('user_response', 'rejected')
        .not('rejection_reason', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('interactions')
        .select('generated_output, edits_made')
        .eq('user_id', userId)
        .eq('user_response', 'edited')
        .not('edits_made', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const profile = profileRes.data;
    const user = userRes.data;
    const rejections = rejectionsRes.data || [];
    const edits = editsRes.data || [];

    // ── Classify dump and fetch profile data in parallel ──
    const classification = await classifyDump(dump);

    // ── Extract profile sections ──
    const voiceDNA = (profile?.voice_dna as Record<string, unknown>) || {};
    const thinkingDNA = (profile?.thinking_dna as Record<string, unknown>) || {};
    const linkedinDNA = (profile?.linkedin_dna as Record<string, unknown>) || {};
    const editingRules: string[] = profile?.editing_rules || [];
    const avoidRules: string[] = profile?.avoid_rules || [];
    const memory = (profile?.memory as Record<string, unknown>) || {};

    // ── Raw onboarding answers ──
    const rawAnswers: string[] = profile?.onboarding_answers || [];
    const rawQuestions: string[] = profile?.onboarding_questions || [];
    const onboardingBlock = rawAnswers.length
      ? rawAnswers.map((a, i) => `Q: ${rawQuestions[i] || `Q${i + 1}`}\nA: ${a}`).join('\n\n')
      : null;

    // ── Rejection signal (raw, before learning engine distills them) ──
    const rejectionBlock = rejections.length
      ? rejections.map((r: { rejection_reason: string }) => `- ${r.rejection_reason}`).join('\n')
      : null;

    // ── Edit signal (raw, before learning engine distills them) ──
    const editBlock = edits.length
      ? edits
          .map(
            (e: { generated_output: string; edits_made: string }, i: number) =>
              `Edit ${i + 1}:\nOriginal: ${e.generated_output?.slice(0, 200)}\nChanged to: ${e.edits_made?.slice(0, 200)}`
          )
          .join('\n\n---\n\n')
      : null;

    // ── User type guidance ──
    const userTypeGuidance =
      user?.user_type === 'jobseeker'
        ? `Job seeker. Posts position them as skilled and intentional. Never mention "open to work".`
        : user?.user_type === 'student'
        ? `Student. Posts feel genuinely curious and growth-oriented.`
        : `Working professional. Posts reflect real experience and field insight.`;

    // ── Hashtag instruction based on LinkedIn DNA ──
    const hashtagCount =
      linkedinDNA.hashtag_usage === 'none' ? 0 :
      linkedinDNA.hashtag_usage === 'minimal' ? 3 :
      linkedinDNA.hashtag_usage === 'moderate' ? 5 : 3;

    const memoryBlock = buildMemoryBlock(memory);

    // ── Build the generation prompt ──
    const systemPrompt = `You are a LinkedIn ghostwriter. Write a post that sounds exactly like this person — not like AI, not like a LinkedIn template.

The intelligence is in the profile below. Follow it precisely.`;

    const userMessage = `
NAME: ${user?.name || 'Unknown'}
TYPE: ${userTypeGuidance}

━━━ POST TYPE ━━━
Type: ${classification.post_type}
Core message: ${classification.core_message}
Core emotion: ${classification.core_emotion}
Structure to follow: ${classification.suggested_structure}
Hook angle: ${classification.hook_angle || 'derive from the dump'}

━━━ VOICE DNA — follow exactly ━━━
${buildVoiceBlock(voiceDNA)}

━━━ THINKING DNA — structure the post this way ━━━
${buildThinkingBlock(thinkingDNA)}

━━━ LINKEDIN PREFERENCES ━━━
${buildLinkedInBlock(linkedinDNA)}

━━━ RULES LEARNED FROM THEIR EDITS ━━━
${editingRules.length > 0 ? editingRules.join('\n') : 'None yet.'}

━━━ THINGS TO AVOID ━━━
${avoidRules.length > 0 ? avoidRules.join('\n') : 'None yet.'}
${rejectionBlock ? `\nRaw rejection reasons:\n${rejectionBlock}` : ''}

━━━ MEMORY — DIVERSIFY FROM RECENT POSTS ━━━
${memoryBlock || 'No previous posts yet.'}

━━━ THEIR ACTUAL WRITING (voice reference) ━━━
${onboardingBlock ? `Study how they write — sentence length, word choices, formality:\n\n${onboardingBlock}` : 'No onboarding data.'}
${editBlock ? `\nRecent edits (strongest voice signal):\n${editBlock}` : ''}

━━━ THE DUMP ━━━
${dump}

━━━ RULES ━━━
VOICE:
- Follow their Voice DNA exactly — non-negotiable
- You own all punctuation and formatting decisions — do not copy the dump's punctuation or lack of it
- Apply proper sentence breaks, paragraph spacing, and rhythm based on their Voice DNA
- Never open with "I" as the first word
- Do not repeatedly start consecutive sentences with "I"
- Never use: "Excited to share", "Humbled", "Game-changer", "Thrilled"

FORMATTING OVERRIDE:
- LinkedIn posts use proper capitalization regardless of Voice DNA — capitalize first word of every sentence
- Use proper punctuation — periods, commas where needed
- Voice DNA applies to: sentence length, formality, word choice, paragraph breaks — NOT capitalization or punctuation

CONTENT:
- Use ALL the details in the dump — do not flatten or summarise. If they gave specific details (names, systems, problems, pivots), include them
- DUMP FIDELITY + EDITORIAL JUDGMENT:
The dump is the only source of truth for facts, tense, emotion, and outcome.
Do not infer, assume, or invent anything not in the dump.

But you are a ghostwriter, not a transcriber. Your job is to:
- Select the most compelling details from the dump — not every sentence needs to become a post sentence
- Cut repetition and filler — if the user said the same thing three ways, pick the best one
- Sequence ideas for impact — the order in the dump is not necessarily the right order for the post
- Make it read like a polished post, not a cleaned-up transcript

The test: would someone want to read this on LinkedIn, or does it just feel like the dump with better punctuation?
- If the dump is uncertain, the post stays uncertain — never fake confidence or resolution
- Never invent facts not in the dump

STRUCTURE:
- Follow the suggested structure for this post type
- Each paragraph should serve a purpose — hook, development, insight, close

FORMAT:
- Length should match their preferred_length preference - "medium" length means 150-250 words — do not write less than 120 words
- End with ${hashtagCount > 0 ? `${hashtagCount} relevant hashtags on a new line` : 'no hashtags'}
- Output ONLY the post. Nothing else.



${previousOutput ? `━━━ PREVIOUS VERSION — IMPROVE DON'T REWRITE ━━━\nUser was not happy with this. Keep what worked, fix what didn't:\n\n${previousOutput}` : ''}
`.trim();

    // ── Generate the post ──
    let post = await groqCall(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      0.65,
      900
    );

    if (!post) {
      return NextResponse.json({ error: 'No post generated' }, { status: 500 });
    }

    // ── Anti-AI filter pass ──
    const filtered = applyAntiAIFilter(post);
    const needsRewrite = hasFlags(filtered);

    if (needsRewrite) {
      // ── Authenticity checker pass — rewrite flagged sentences only ──
      const rewritten = await groqCall(
        [
          {
            role: 'system',
            content: `You are an editor. Rewrite flagged words/phrases marked as [FLAG:word] with plain, human language. Keep everything else exactly the same. Output only the post.`,
          },
          {
            role: 'user',
            content: `Rewrite only the flagged parts in this post. Use simple, direct language. Match the surrounding tone:\n\n${filtered}`,
          },
        ],
        0.5,
        900
      );
      post = rewritten || stripFlags(filtered);
    } else {
      post = filtered;
    }

    // ── Final cleanup ──
    post = post
      .replace(/\[FLAG:[^\]]+\]/gi, '')
      .trim();

    return NextResponse.json({ post, classification });

  } catch (err) {
  console.error('Generate error:', err);

  const message =
    err instanceof Error
      ? err.message
      : 'Something went wrong';

  return NextResponse.json(
    { error: message },
    { status: 500 }
  );
}
}