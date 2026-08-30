import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { dump, userId, previousOutput, lastRejectionReason } = await req.json();

    // Parallel fetch — all DB calls at once
    const [profileResult, userResult, rejectionsResult, editsResult, editingRulesResult] =
      await Promise.all([
        supabaseAdmin.from('user_profiles').select('*').eq('user_id', userId).single(),
        supabaseAdmin.from('users').select('name, user_type').eq('id', userId).single(),
        supabaseAdmin
          .from('interactions')
          .select('rejection_reason')
          .eq('user_id', userId)
          .eq('user_response', 'rejected')
          .not('rejection_reason', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20),
        supabaseAdmin
          .from('interactions')
          .select('generated_output, edits_made')
          .eq('user_id', userId)
          .eq('user_response', 'edited')
          .not('edits_made', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20),
        supabaseAdmin
          .from('editing_rules')
          .select('rule')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

    const profile = profileResult.data;
    const user = userResult.data;
    const rejections = rejectionsResult.data;
    const edits = editsResult.data;
    const editingRules = editingRulesResult.data;

    const voiceDNA = profile?.voice_dna || {};
    const thinkingDNA = profile?.thinking_dna || {};
    const linkedinDNA = profile?.linkedin_dna || {};
    const memory = profile?.memory || {};

    const recentTopics = memory?.recent_topics?.slice(0, 6) || [];
    const recentHooks = memory?.recent_hooks?.slice(0, 3) || [];
    const recentHashtags = memory?.recent_hashtags?.slice(0, 6) || [];

    const rejectionContext = rejections?.length
      ? rejections.map((r: { rejection_reason: string }) => `- ${r.rejection_reason}`).join('\n')
      : null;

    const editContext = edits?.length
      ? edits
          .slice(0, 5)
          .map(
            (e: { generated_output: string; edits_made: string }, i: number) =>
              `Example ${i + 1}:\nBefore: ${e.generated_output?.slice(0, 150)}...\nAfter: ${e.edits_made?.slice(0, 150)}...`
          )
          .join('\n\n')
      : null;

    const learnedRules = editingRules?.length
      ? editingRules.map((r: { rule: string }) => `- ${r.rule}`).join('\n')
      : null;

    const userTypeNote =
      user?.user_type === 'jobseeker'
        ? 'This person is actively job seeking. Posts should position them as capable and intentional without sounding desperate.'
        : user?.user_type === 'student'
        ? 'This person is a student. Posts should feel authentic and curious, not like they are trying to seem more senior.'
        : 'This person is a working professional sharing real experience.';

    const systemPrompt = `You are a ghostwriter for LinkedIn. Your job is to turn someone's raw, unfiltered thoughts into a post that sounds exactly like them — not like a cleaned-up AI summary, and not like a generic LinkedIn post.

The person you are writing for:
Name: ${user?.name || 'Unknown'}
${userTypeNote}

Their voice:
- Sentence length: ${voiceDNA.sentence_length || 'medium'}
- Formality: ${voiceDNA.formality || 'medium'}
- Capitalization: ${voiceDNA.capitalization || 'normal'} (NOTE: even if their dump is all-lowercase, LinkedIn posts should use proper capitalization — capitalize the first word of every sentence)
- Paragraph style: ${voiceDNA.paragraph_style || 'mixed'}
- Hedging words they use: ${voiceDNA.hedging_words?.join(', ') || 'none noted'}
- Vocabulary: ${voiceDNA.vocabulary_complexity || 'medium'}
- Contractions: ${voiceDNA.contractions_usage || 'sometimes'}
- Emoji: ${voiceDNA.emoji_usage || 'never'}
- Lists: ${voiceDNA.list_usage || 'rare'}

How they think and structure ideas:
- Usually starts with: ${thinkingDNA.starts_with || 'observation'}
- Develops into: ${thinkingDNA.develops_into || 'analysis'}
- Ends with: ${thinkingDNA.ends_with || 'open thought'}
- Thinking style: ${thinkingDNA.thinking_style || 'linear'}

LinkedIn context:
- Audience: ${linkedinDNA.audience || 'professionals'}
- Goal: ${linkedinDNA.posting_goal || 'build presence'}
- Preferred post types: ${linkedinDNA.preferred_post_types?.join(', ') || 'story, reflection'}
- Hook style: ${linkedinDNA.hook_style || 'curiosity'}
- Hashtags: ${linkedinDNA.hashtag_usage || 'minimal'}, style: ${linkedinDNA.hashtag_style || 'niche'}
- Uses line breaks: ${linkedinDNA.uses_line_breaks ? 'yes' : 'no'}
- Uses bullet points: ${linkedinDNA.uses_bullet_points ? 'yes' : 'no'}
- Desired perception: ${linkedinDNA.desired_perception || 'knowledgeable professional'}

${recentTopics.length ? `Topics they have posted about recently (avoid repeating): ${recentTopics.join(', ')}` : ''}
${recentHooks.length ? `Recent hooks they used (do not reuse): ${recentHooks.join(' | ')}` : ''}
${recentHashtags.length ? `Recent hashtags (avoid reusing the same ones every time): ${recentHashtags.join(', ')}` : ''}

${editContext ? `How they have edited previous posts (your strongest signal for their real voice):\n${editContext}` : ''}
${learnedRules ? `Specific rules learned from their edits:\n${learnedRules}` : ''}
${rejectionContext ? `Things they have rejected before — do not repeat these:\n${rejectionContext}` : ''}
${lastRejectionReason ? `They just rejected the last version because: "${lastRejectionReason}". Fix this specifically.` : ''}

YOUR CORE TASK:

Before you write anything, read the dump carefully and understand what is actually in it:
- What is the real experience, realization, observation, or opinion being shared?
- What specific details, names, numbers, or turning points exist?
- What is the emotional core — frustration, excitement, uncertainty, pride?
- What would be genuinely interesting or useful for their audience to read?

Then write the post. The post should:
1. PRESERVE THE SUBSTANCE — do not compress a rich dump into 3-5 sentences. If the dump has texture and detail, the post should have texture and detail. Match the richness of the input.
2. SAY WHAT THEY SAID — not a summary, not a cleaned-up version. The specific things they mentioned should appear in the post. If they said "I was focusing on the system prompt and it wasn't working" — that should be in the post, in their words.
3. SOUND LIKE THEM — use their voice profile to shape how it reads, not what it says. The dump is the what. The voice profile is the how.
4. HOOK FIRST — the first line should earn the reader's attention. Do not start with "I" as the opening word.
5. NO CORPORATE AI LANGUAGE — never use: "delighted", "thrilled", "humbled", "game-changer", "excited to share", "in today's world", "leverage", "synergy", "dive deep", "unpack"
6. NEVER USE "WE" unless the dump explicitly mentions a team or collaboration.
7. END WITH 3-5 relevant hashtags on a new line.

Length guidance: match the richness of the dump. A 200-word dump should produce a 150-250 word post, not a 50-word summary. A short 30-word dump can produce a short punchy post.

${previousOutput ? `Previous version they want improved:\n${previousOutput}\n\nKeep what worked. Fix what they did not like.` : ''}

Output the post only. No intro. No explanation. Start directly with the first word of the post.`;

    const userMessage = `Here is my raw dump:\n\n${dump}`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.75,
        max_tokens: 1200,
      }),
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error('Groq API error:', data);
      return NextResponse.json({ error: 'Generation failed', details: data }, { status: 500 });
    }

    const raw = data.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      return NextResponse.json({ error: 'No post generated' }, { status: 500 });
    }

    // Strip any think tags if model outputs them
    const post = raw
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '')
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .trim();

    return NextResponse.json({ post });

  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}