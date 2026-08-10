import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, post, postType } = await req.json();

    if (!userId || !post) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // ── Extract memory signals from the accepted post ──
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Extract memory signals from a LinkedIn post. Return ONLY raw JSON — no markdown, no backticks.`,
          },
          {
            role: 'user',
            content: `Extract memory signals from this accepted LinkedIn post:

${post}

Return:
{
  "topics": ["1-3 main topics mentioned, single words or short phrases"],
  "hook": "the exact opening line of the post",
  "hashtags": ["all hashtags used, without the # symbol"],
  "opening_word": "the very first word of the post"
}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';
    const clean = raw.replace(/```json|```/g, '').trim();

    let signals: { topics: string[]; hook: string; hashtags: string[]; opening_word: string };
    try {
      signals = JSON.parse(clean);
    } catch {
      return NextResponse.json({ success: true, updated: false });
    }

    // ── Fetch existing memory ──
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('memory')
      .eq('user_id', userId)
      .single();

    const existing = (profile?.memory as Record<string, unknown>) || {};

    const recentTopics: string[] = (existing.recent_topics as string[]) || [];
    const recentHooks: string[] = (existing.recent_hooks as string[]) || [];
    const recentHashtags: string[] = (existing.recent_hashtags as string[]) || [];
    const recentPostTypes: string[] = (existing.recent_post_types as string[]) || [];
    const recentOpenings: string[] = (existing.recent_openings as string[]) || [];
    const postCount: number = (existing.post_count as number) || 0;

    // ── Merge new signals, keep last 10 of each ──
    const updatedMemory = {
      recent_topics: [...(signals.topics || []), ...recentTopics].slice(0, 10),
      recent_hooks: [signals.hook, ...recentHooks].filter(Boolean).slice(0, 5),
      recent_hashtags: [...(signals.hashtags || []), ...recentHashtags].slice(0, 10),
      recent_post_types: [postType || 'unknown', ...recentPostTypes].slice(0, 5),
      recent_openings: [signals.opening_word, ...recentOpenings].filter(Boolean).slice(0, 5),
      post_count: postCount + 1,
      last_posted_at: new Date().toISOString(),
    };

    await supabaseAdmin
      .from('user_profiles')
      .update({ memory: updatedMemory })
      .eq('user_id', userId);

    return NextResponse.json({ success: true, updated: true, memory: updatedMemory });

  } catch (err) {
    console.error('Update memory error:', err);
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 });
  }
}