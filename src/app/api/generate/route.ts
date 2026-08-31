import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { dump, userId, previousOutput, lastRejectionReason } = await req.json();

    if (!dump?.trim() || !userId) {
      return NextResponse.json({ error: 'Missing dump or userId' }, { status: 400 });
    }

    const [profileResult, userResult] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select(`
          domain,
          role,
          project_type,
          baseline_confidence,
          enthusiasm_level,
          technical_depth,
          explanation_style,
          emotional_honesty,
          problem_solving_style,
          vulnerability_level,
          audience,
          posting_goal,
          desired_perception,
          passion_areas,
          sentence_rhythm,
          structure_preference,
          real_vocabulary,
          explicit_preferences,
          personality_type,
          self_awareness,
          ai_tool_relationship
        `)
        .eq('user_id', userId)
        .single(),
      supabaseAdmin
        .from('users')
        .select('name, user_type')
        .eq('id', userId)
        .single(),
    ]);

    if (profileResult.error && profileResult.error.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileResult.error);
    }

    const profile = profileResult.data;
    const user = userResult.data;

    const profileContext = [
      `Domain: ${profile?.domain || 'unknown'}`,
      `Role: ${profile?.role || 'unknown'}`,
      `Project/work type: ${profile?.project_type || 'unknown'}`,
      `Baseline confidence: ${profile?.baseline_confidence || 'unknown'}`,
      `Enthusiasm level: ${profile?.enthusiasm_level || 'unknown'}`,
      `Technical depth: ${profile?.technical_depth || 'unknown'}`,
      `Explanation style: ${profile?.explanation_style || 'unknown'}`,
      `Emotional honesty: ${profile?.emotional_honesty || 'unknown'}`,
      `Problem-solving style: ${profile?.problem_solving_style || 'unknown'}`,
      `Vulnerability level: ${profile?.vulnerability_level || 'unknown'}`,
      `Audience: ${profile?.audience || 'professionals'}`,
      `Posting goal: ${profile?.posting_goal || 'build presence'}`,
      `Desired perception: ${profile?.desired_perception || 'knowledgeable professional'}`,
      `Passion areas: ${profile?.passion_areas || 'unknown'}`,
      `Sentence rhythm: ${profile?.sentence_rhythm || 'mixed'}`,
      `Structure preference: ${profile?.structure_preference || 'natural progression'}`,
      `Real vocabulary: ${profile?.real_vocabulary || 'unknown'}`,
      `Explicit preferences: ${profile?.explicit_preferences || 'none noted'}`,
      `Personality type: ${profile?.personality_type || 'unknown'}`,
      `Self-awareness: ${profile?.self_awareness || 'unknown'}`,
      `AI-tool relationship: ${profile?.ai_tool_relationship || 'unknown'}`,
    ].join('\n');

    const userTypeGuidance =
      user?.user_type === 'jobseeker'
        ? 'This person is actively job seeking. Position them as capable and intentional without sounding desperate.'
        : user?.user_type === 'student'
        ? 'This person is a student. Keep the post authentic and curious; do not make them sound more senior than they are.'
        : 'This person is a working professional. Ground the post in real experience and genuine insight.';

    const retryContext = previousOutput
      ? `\n\nPREVIOUS DRAFT TO IMPROVE:\n${previousOutput}${lastRejectionReason ? `\n\nUSER'S REASON FOR REJECTING IT:\n${lastRejectionReason}` : ''}`
      : '';

    const systemPrompt = `You are DumpPost, a ghostwriter for LinkedIn professionals in technology and adjacent fields.

Your job is simple: take the user's raw dump and turn it into a LinkedIn post that sounds like THIS person.

Do not sound like generic LinkedIn content. Do not turn the dump into a motivational summary. Preserve the person's actual experience, observations, details, uncertainty, opinions, and vocabulary.

USER PROFILE
Name: ${user?.name || 'Unknown'}
${userTypeGuidance}

The following profile was extracted during onboarding. It describes the person and their natural communication style. Use it to shape HOW you write, not to invent WHAT they experienced.

${profileContext}

WRITING RULES
1. Preserve the substance of the dump. Do not throw away useful details just to make the post shorter.
2. Use the person's natural level of technical depth and formality.
3. Use their real vocabulary where it fits. Do not replace their wording with corporate or polished language.
4. If the dump expresses uncertainty, frustration, excitement, or a partial realization, preserve that feeling instead of manufacturing certainty.
5. Do not invent facts, numbers, experiences, opinions, people, results, or lessons.
6. Start with an attention-worthy first line that fits this person's voice. Do not force a dramatic or clickbait hook.
7. Do not start the post with the word "I".
8. Never use generic corporate/AI phrases such as "game-changer", "excited to share", "humbled", "thrilled", "delighted", "in today's world", "leverage", "synergy", "dive deep", or "unpack".
9. Do not use "we" unless the dump explicitly refers to a team or collaboration.
10. Let the structure follow the content. Do not force the same hook → lesson → CTA template every time.
11. Length should be proportional to the richness of the dump. A detailed dump deserves a detailed post; a short dump can be short.
12. End with 3–5 relevant hashtags on a new line.
13. Output ONLY the LinkedIn post. No explanation, title, preamble, or commentary.${retryContext}`;

    const groqResponse = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Here is my raw dump. Turn it into the post:\n\n${dump.trim()}`,
          },
        ],
        temperature: 0.75,
        reasoning_effort: 'low',
        max_tokens: 1200,
      }),
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error('Groq generation error:', data);
      return NextResponse.json({ error: 'Generation failed', details: data }, { status: 500 });
    }

    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      console.error('Groq returned no generated content:', JSON.stringify(data));
      return NextResponse.json({ error: 'No post generated' }, { status: 500 });
    }

    const post = raw
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .trim();

    return NextResponse.json({ post, reasoning: null });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
