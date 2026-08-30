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


Before writing, read the dump and genuinely understand what this person is trying to say. 
What is the real experience? What specific details matter? What is the emotional core?

Then write the post the way a skilled human ghostwriter would — someone who deeply understands this person's voice and is trying to help them say something worth reading. 
A good ghostwriter does not follow a checklist. They understand the person and write something that person would be proud to post.

The post should feel like it was written by this person on their best day — specific, natural, honest, and genuinely interesting to their audience.

The only hard constraints:
- Do not start with "I" as the first word
- Do not use "we" unless the dump mentions a team
- End with 3-5 relevant hashtags
- Use proper capitalization regardless of how the dump is written
- Match the length and richness of the dump — do not compress

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
        temperature: 0.82,
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