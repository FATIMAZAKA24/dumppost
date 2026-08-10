import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, originalPost, editedPost } = await req.json();

    if (!userId || !originalPost || !editedPost) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // ── Extract rules from the edit ──
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
            content: `You are a writing analyst. Compare an original and edited LinkedIn post and extract concrete writing rules from what changed. Return ONLY raw JSON — no markdown, no backticks.`,
          },
          {
            role: 'user',
            content: `Compare these two versions and extract what changed as reusable writing rules.

ORIGINAL:
${originalPost}

EDITED TO:
${editedPost}

Analyze every change — word replacements, sentence restructuring, additions, deletions, tone shifts, length changes.

Return:
{
  "rules": [
    "Avoid: '[exact phrase from original]' — Prefer: '[exact phrase from edited]'",
    "Avoid: '[pattern]' — Prefer: '[pattern]'"
  ],
  "summary": "one sentence describing the overall pattern of changes"
}

Rules must be specific and actionable. If nothing meaningful changed, return an empty rules array.
Maximum 5 rules per edit.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 400,
      }),
    });

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';
    const clean = raw.replace(/```json|```/g, '').trim();

    let extracted: { rules: string[]; summary: string };
    try {
      extracted = JSON.parse(clean);
    } catch {
      return NextResponse.json({ success: true, rules_added: 0 });
    }

    if (!extracted.rules || extracted.rules.length === 0) {
      return NextResponse.json({ success: true, rules_added: 0 });
    }

    // ── Fetch existing editing_rules ──
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('editing_rules')
      .eq('user_id', userId)
      .single();

    const existingRules: string[] = profile?.editing_rules || [];

    // ── Merge new rules, avoid duplicates, keep max 50 ──
    const newRules = extracted.rules.filter(
      (rule: string) => !existingRules.some(
        (existing) => existing.toLowerCase().includes(rule.slice(0, 20).toLowerCase())
      )
    );

    const updatedRules = [...newRules, ...existingRules].slice(0, 50);

    // ── Save back to user_profiles ──
    await supabaseAdmin
      .from('user_profiles')
      .update({ editing_rules: updatedRules })
      .eq('user_id', userId);

    return NextResponse.json({
      success: true,
      rules_added: newRules.length,
      rules: newRules,
      summary: extracted.summary,
    });

  } catch (err) {
    console.error('Learn from edit error:', err);
    return NextResponse.json({ error: 'Failed to learn from edit' }, { status: 500 });
  }
}