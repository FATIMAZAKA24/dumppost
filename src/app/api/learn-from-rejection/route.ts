import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, rejectionReason, generatedPost } = await req.json();

    if (!userId || !rejectionReason) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // ── Convert rejection reason into actionable writing rules ──
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
            content: `You are a writing coach. Convert a user's rejection feedback about a LinkedIn post into concrete, actionable writing rules. Return ONLY raw JSON — no markdown, no backticks.`,
          },
          {
            role: 'user',
            content: `A user rejected a generated LinkedIn post with this feedback:

REJECTION REASON: "${rejectionReason}"

${generatedPost ? `REJECTED POST:\n${generatedPost}` : ''}

Convert this feedback into 1-3 specific, actionable writing rules that should be applied to ALL future posts for this user.

Rules must be concrete and specific — not vague. 

Examples of good rules:
- "Use contractions (it's, I've, don't) — avoid formal constructions"
- "Keep sentences under 10 words — no long compound sentences"
- "Don't open with rhetorical questions — feels forced"
- "Avoid bullet points — write in flowing prose"
- "Don't start with a dramatic one-liner hook — feels performative"

Examples of bad rules (too vague):
- "Be more casual"
- "Improve the tone"
- "Make it better"

Return:
{
  "rules": [
    "specific actionable rule 1",
    "specific actionable rule 2"
  ],
  "interpretation": "one sentence — what did the user actually mean by this feedback?"
}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 400,
      }),
    });

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';
    const clean = raw.replace(/```json|```/g, '').trim();

    let extracted: { rules: string[]; interpretation: string };
    try {
      extracted = JSON.parse(clean);
    } catch {
      return NextResponse.json({ success: true, rules_added: 0 });
    }

    if (!extracted.rules || extracted.rules.length === 0) {
      return NextResponse.json({ success: true, rules_added: 0 });
    }

    // ── Fetch existing avoid_rules ──
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('avoid_rules')
      .eq('user_id', userId)
      .single();

    const existingRules: string[] = profile?.avoid_rules || [];

    // ── Merge, deduplicate, keep max 30 ──
    const newRules = extracted.rules.filter(
      (rule: string) => !existingRules.some(
        (existing) => existing.toLowerCase().includes(rule.slice(0, 20).toLowerCase())
      )
    );

    const updatedRules = [...newRules, ...existingRules].slice(0, 30);

    // ── Save back ──
    await supabaseAdmin
      .from('user_profiles')
      .update({ avoid_rules: updatedRules })
      .eq('user_id', userId);

    return NextResponse.json({
      success: true,
      rules_added: newRules.length,
      rules: newRules,
      interpretation: extracted.interpretation,
    });

  } catch (err) {
    console.error('Learn from rejection error:', err);
    return NextResponse.json({ error: 'Failed to learn from rejection' }, { status: 500 });
  }
}