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

    // ── Raw onboarding Q&A ──
    const rawAnswers: string[] = profile?.onboarding_answers || [];
    const rawQuestions: string[] = profile?.onboarding_questions || [];
    const onboardingBlock = rawAnswers.length
      ? rawAnswers.map((a: string, i: number) =>
          `Q: ${rawQuestions[i] || `Question ${i + 1}`}\nA: ${a}`
        ).join('\n\n')
      : null;

    // ── Edit signal ──
    const editBlock = edits?.length
      ? edits.map((e: { generated_output: string; edits_made: string }, i: number) =>
          `Edit ${i + 1}:\nOriginal: ${e.generated_output?.slice(0, 300)}\nChanged to: ${e.edits_made?.slice(0, 300)}`
        ).join('\n\n---\n\n')
      : null;

    // ── Rejection signal ──
    const rejectionBlock = rejections?.length
      ? rejections.map((r: { rejection_reason: string }) => `- ${r.rejection_reason}`).join('\n')
      : null;

    // ── User type ──
    const userTypeGuidance =
      user?.user_type === 'jobseeker'
        ? `This person is actively job seeking. Posts should position them as skilled and intentional — not desperate. Highlight competence, curiosity, growth. Never mention "open to work".`
        : user?.user_type === 'student'
        ? `This person is a student. Posts should feel genuinely curious and growth-oriented — not trying to sound more senior than they are.`
        : `This person is a working professional. Posts should reflect real experience and genuine insight from the field.`;

    // ── Extracted signals (secondary) ──
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

    const systemPrompt = `You are DumpPost. You turn raw, unfiltered thoughts into LinkedIn posts that sound exactly like the person who wrote them.

Your output MUST follow this exact two-part format — no exceptions:

<thinking>
Your private reasoning goes here. Before writing anything, think through:
1. VOICE ANALYSIS — Read the onboarding answers carefully. How does this person actually write? Note their sentence length, word choices, formality level, how much they hedge vs how confident they sound, any distinctive phrases or patterns. Be specific — don't say "casual", say "uses lowercase, short bursts, self-deprecating".
2. DUMP ANALYSIS — What is the core thing they want to say? What's the emotion or insight underneath the raw thought? What should the hook be?
3. VOICE MATCH PLAN — How will you write this post to sound like them specifically? What would you avoid that would sound too polished, too AI, too generic?
4. STRUCTURE PLAN — What's the opening line? How does it flow? How does it end?
</thinking>
<post>
The LinkedIn post goes here. Nothing else — no intro, no explanation, no "Here's your post:". Just the post itself, ending with 3-5 hashtags on a new line.
</post>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHO THIS PERSON IS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${user?.name || 'Unknown'}
${userTypeGuidance}
${signalSummary ? `\nExtracted signals (use for calibration only):\n${signalSummary}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THEIR ACTUAL WORDS — primary voice signal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${onboardingBlock
  ? `Read these carefully before writing anything. This is how they actually write:\n\n${onboardingBlock}`
  : 'No onboarding answers available yet — rely on signals above.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT THEY'VE CORRECTED — strongest signal if available
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${editBlock
  ? `Study every change they made — the gap between original and edited is your clearest voice signal:\n\n${editBlock}`
  : 'No edits yet.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT TO AVOID
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rejectionBlock
  ? `They rejected posts for these reasons:\n${rejectionBlock}`
  : 'No rejections yet.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WRITING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- First line must earn attention — but feel like them, not a copywriting hook
- Never open with "I"
- Never use: "Excited to share", "Humbled", "Game-changer", "Thrilled", "Delighted"
- No corporate filler — cut anything that sounds like a press release
- If the dump expresses uncertainty, the post should stay uncertain — never fake confidence
- Never invent details not in the dump
- Length proportional to input richness
- End with 3–5 relevant hashtags on a new line

${previousOutput
  ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PREVIOUS VERSION — IMPROVE DON'T REWRITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User wasn't happy with this. Keep what worked, fix what didn't:\n\n${previousOutput}`
  : ''}`;

    const userMessage = `Here's what's on my mind:\n\n${dump}`;

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
        max_tokens: 1400,
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

    // Extract reasoning and post separately
    const reasoningMatch = fullResponse.match(/<thinking>([\s\S]*?)<\/thinking>/);
    const postMatch = fullResponse.match(/<post>([\s\S]*?)<\/post>/);

    const reasoning = reasoningMatch?.[1]?.trim() || null;

    // If model followed format, use the post block. Otherwise fall back to stripping tags.
    const post = postMatch?.[1]?.trim() ||
      fullResponse
        .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
        .replace(/<post>|<\/post>/g, '')
        .trim();

    if (!post) {
      return NextResponse.json({ error: 'No post generated' }, { status: 500 });
    }

    return NextResponse.json({ post, reasoning });

  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}