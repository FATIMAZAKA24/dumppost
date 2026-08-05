import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { dump, userId, previousOutput } = await req.json();

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('name, user_type')
      .eq('id', userId)
      .single();

    const { data: rejections } = await supabaseAdmin
      .from('interactions')
      .select('rejection_reason')
      .eq('user_id', userId)
      .eq('user_response', 'rejected')
      .not('rejection_reason', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: edits } = await supabaseAdmin
      .from('interactions')
      .select('generated_output, edits_made')
      .eq('user_id', userId)
      .eq('user_response', 'edited')
      .not('edits_made', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    // ── Build raw onboarding Q&A block ──
    // This is the user's actual voice — their words, not labels extracted from them
    const rawAnswers: string[] = profile?.onboarding_answers || [];
    const rawQuestions: string[] = profile?.onboarding_questions || [];
    const onboardingBlock = rawAnswers.length
      ? rawAnswers.map((a: string, i: number) =>
          `Q: ${rawQuestions[i] || `Question ${i + 1}`}\nA: ${a}`
        ).join('\n\n')
      : null;

    // ── Build edit signal block ──
    const editBlock = edits?.length
      ? edits.map((e: { generated_output: string; edits_made: string }, i: number) =>
          `Edit ${i + 1}:\nOriginal: ${e.generated_output?.slice(0, 300)}\nChanged to: ${e.edits_made?.slice(0, 300)}`
        ).join('\n\n---\n\n')
      : null;

    // ── Build rejection block ──
    const rejectionBlock = rejections?.length
      ? rejections.map((r: { rejection_reason: string }) => `- ${r.rejection_reason}`).join('\n')
      : null;

    // ── User type context ──
    const userTypeGuidance =
      user?.user_type === 'jobseeker'
        ? `This person is actively job seeking. Posts should position them as skilled and intentional — not desperate. Highlight competence, curiosity, growth. Never mention "open to work".`
        : user?.user_type === 'student'
        ? `This person is a student. Posts should feel genuinely curious and growth-oriented — not trying to sound more senior than they are.`
        : `This person is a working professional. Posts should reflect real experience and genuine insight from the field.`;

    // ── Extracted signal summary (secondary, not primary) ──
    const signalSummary = profile ? [
      profile.domain && `Field: ${profile.domain}`,
      profile.role && `Role: ${profile.role}`,
      profile.sentence_rhythm && `Sentence rhythm: ${profile.sentence_rhythm}`,
      profile.structure_preference && `Structure preference: ${profile.structure_preference}`,
      profile.technical_depth && `Technical depth: ${profile.technical_depth}`,
      profile.emotional_honesty && `Emotional honesty: ${profile.emotional_honesty}`,
      profile.personality_type && `Personality: ${profile.personality_type}`,
      profile.real_vocabulary && `Vocabulary they use: ${profile.real_vocabulary}`,
      profile.posting_goal && `Posting goal: ${profile.posting_goal}`,
      profile.audience && `Target audience: ${profile.audience}`,
      profile.explicit_preferences && `Explicit preferences: ${profile.explicit_preferences}`,
    ].filter(Boolean).join('\n') : null;

    const systemPrompt = `You are DumpPost. You turn raw, unfiltered thoughts into LinkedIn posts that sound exactly like the person who wrote them — not like AI, not like a LinkedIn template.

Your single most important job: preserve their voice. If they write casually, write casually. If they're uncertain, stay uncertain. If they're technical and dry, stay technical and dry. Never polish away their personality.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHO THIS PERSON IS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${user?.name || 'Unknown'}
${userTypeGuidance}
${signalSummary ? `\nExtracted signals (use for calibration, not as rules):\n${signalSummary}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THEIR ACTUAL WORDS (most important voice signal)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${onboardingBlock
  ? `These are the user's own answers in their own words. Study how they write — their sentence length, word choices, level of formality, how much they hedge vs how confident they sound. This is your voice reference:\n\n${onboardingBlock}`
  : 'No onboarding answers available yet.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT THEY'VE CORRECTED (strongest signal if available)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${editBlock
  ? `The user has edited previous posts. The gap between original and edited version tells you exactly what they don't like. Learn from every change:\n\n${editBlock}`
  : 'No edits yet — rely on onboarding answers for voice calibration.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT TO AVOID
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rejectionBlock
  ? `They've rejected posts for these reasons — do not repeat:\n${rejectionBlock}`
  : 'No rejections yet.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WRITING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- First line must earn attention — but make it feel like them, not a copywriting hook
- Never open with "I"
- Never use: "Excited to share", "Humbled", "Game-changer", "Thrilled", "Delighted"
- No corporate filler — cut anything that sounds like a press release
- Stay true to the dump: if they're figuring something out, the post should reflect that uncertainty, not fake confidence
- Never invent details not in the dump. Use profile context only to shape tone and style
- Length proportional to input — a short dump should produce a short post
- End with 3–5 relevant hashtags on a new line
- Output ONLY the post. No intro, no explanation, no "Here's your post:"

${previousOutput
  ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PREVIOUS VERSION — IMPROVE, DON'T REWRITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user wasn't happy with this. Keep what worked, fix what didn't:\n\n${previousOutput}`
  : ''}`;

    const userMessage = `Here's what's on my mind — turn this into a LinkedIn post in my voice:\n\n${dump}`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.92,
        max_tokens: 900,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq error:', groqRes.status, errText);
      return NextResponse.json({ error: `Groq error ${groqRes.status}` }, { status: 500 });
    }

    const data = await groqRes.json();
    const fullResponse = data.choices?.[0]?.message?.content?.trim();

    if (!fullResponse) {
      console.error('Groq returned no content:', JSON.stringify(data));
      return NextResponse.json({ error: 'No post generated' }, { status: 500 });
    }

    const post = fullResponse
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '')
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .trim();

    return NextResponse.json({ post, reasoning: null });

  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}