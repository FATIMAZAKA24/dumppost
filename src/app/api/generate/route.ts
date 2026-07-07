import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { dump, userId, previousOutput, lastRejectionReason } = await req.json();

    // Fetch extracted profile signals from DB (maybeSingle so it doesn't throw on null)
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch user basic info
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('name, user_type')
      .eq('id', userId)
      .maybeSingle();

    // Fetch last 5 rejection reasons (pooled, general "what to avoid" signal)
    const { data: rejections } = await supabaseAdmin
      .from('interactions')
      .select('rejection_reason')
      .eq('user_id', userId)
      .eq('user_response', 'rejected')
      .not('rejection_reason', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch last 5 edited posts
    const { data: edits } = await supabaseAdmin
      .from('interactions')
      .select('generated_output, edits_made')
      .eq('user_id', userId)
      .eq('user_response', 'edited')
      .not('edits_made', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    const rejectionContext = rejections?.length
      ? rejections.map((r: { rejection_reason: string }) => `- ${r.rejection_reason}`).join('\n')
      : null;

    // Smart-truncate at sentence boundary instead of mid-sentence slicing
    const smartTruncate = (text: string | null, maxLen: number) => {
      if (!text) return '';
      if (text.length <= maxLen) return text;
      const slice = text.slice(0, maxLen);
      const lastPeriod = slice.lastIndexOf('.');
      return lastPeriod > maxLen * 0.5 ? slice.slice(0, lastPeriod + 1) : slice + '...';
    };

    const editContext = edits?.length
      ? edits.map((e: { generated_output: string; edits_made: string }, i: number) =>
          `Edit ${i + 1}:\nOriginal: ${smartTruncate(e.generated_output, 350)}\nEdited to: ${smartTruncate(e.edits_made, 350)}`
        ).join('\n\n')
      : null;

    const profileContext = profile ? `
Domain: ${profile.domain || 'unknown'}
Role: ${profile.role || 'unknown'}
Project type: ${profile.project_type || 'unknown'}
Baseline confidence: ${profile.baseline_confidence || 'unknown'}
Enthusiasm level: ${profile.enthusiasm_level || 'unknown'}
Technical depth: ${profile.technical_depth || 'unknown'}
Explanation style: ${profile.explanation_style || 'unknown'}
Emotional honesty: ${profile.emotional_honesty || 'unknown'}
Problem solving style: ${profile.problem_solving_style || 'unknown'}
Vulnerability level: ${profile.vulnerability_level || 'unknown'}
Audience: ${profile.audience || 'unknown'}
Posting goal: ${profile.posting_goal || 'unknown'}
Self awareness: ${profile.self_awareness || 'unknown'}
Desired perception: ${profile.desired_perception || 'unknown'}
Passion areas: ${profile.passion_areas || 'unknown'}
Sentence rhythm: ${profile.sentence_rhythm || 'unknown'}
Structure preference: ${profile.structure_preference || 'unknown'}
Real vocabulary: ${profile.real_vocabulary || 'unknown'}
Explicit preferences: ${profile.explicit_preferences || 'none'}
AI tool relationship: ${profile.ai_tool_relationship || 'unknown'}
Personality type: ${profile.personality_type || 'unknown'}` : 'No profile available yet — rely on the raw dump itself for voice signals.';

    const systemPrompt = `You are DumpPost — an AI that converts raw, unfiltered thoughts into authentic, personalised LinkedIn posts.

Your core job: make the post sound exactly like THIS person, not a generic LinkedIn voice.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAYER 1 — USER VOICE PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${user?.name || 'Unknown'}
Type: ${user?.user_type === 'student' ? 'Student' : 'Working Professional'}

${profileContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAYER 2 — VOICE CORRECTIONS (EDITS MADE BY USER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${editContext ? `These are posts the user edited — the difference between original and edited version is your strongest voice signal. Learn from what they changed:\n\n${editContext}` : 'No edits yet.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAYER 3 — WHAT TO AVOID (REJECTION REASONS) — THESE ARE DIRECT INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rejectionContext ? `The user has rejected posts for these reasons. Treat each one as a DIRECT INSTRUCTION, not a soft preference. These override every default rule in LAYER 4 — including formatting defaults like whether to use bullet points, length, tone, or structure. If a rejection reason explicitly asks for something (e.g. "use bullets", "make it shorter", "don't mention X"), you MUST comply with it in this generation:\n${rejectionContext}` : 'No rejections yet.'}

${lastRejectionReason ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MOST IMPORTANT — THE REASON THE IMMEDIATELY PRIOR VERSION WAS REJECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is the specific feedback on the LAYER 5 previous version below. Fix exactly this, before anything else:
"${lastRejectionReason}"` : ''}

LAYER 4 — DUMPPOST RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Write in first person as the user — their voice, their words
- Hook first — first line must stop the scroll
- Never start with "I" as the opening word
- Never use "Excited to share", "Humbled", "Game-changer", "Thrilled"
- No bullet points unless their structure_preference suggests it, OR the user has explicitly asked for bullets in a rejection reason (see LAYER 3 — that always wins)
- Output length proportional to input richness
- Structure: hook → insight or story → takeaway → optional question
- Add 3–5 relevant hashtags at the end
- Output ONLY the LinkedIn post — no preamble, no explanation

VOICE MATCHING — THIS IS YOUR MOST IMPORTANT JOB:
- Study how the user actually writes in their onboarding answers. 
  Their vocabulary, sentence length, energy level — mirror all of it.
- If they write simply, write simply. Do not elevate their vocabulary 
  to sound more professional.
- Improve the structure and clarity of their thoughts — 
  but never change who they sound like.
- The test: would this person read the output and think 
  "that sounds like me" or "that sounds like LinkedIn"? 
  It must always be the former.
- Don't just paraphrase the dump — transform it. 
  Expand on the insight, add your own angle, make it 
  more interesting than the raw input. The dump is the 
  starting point, not the script.

${previousOutput ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAYER 5 — PREVIOUS VERSION (REFINE THIS, DON'T REWRITE FROM SCRATCH)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user rejected this version. Keep what worked, fix exactly what didn't based on the rejection reason above:

${previousOutput}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — INTERNAL REASONING (do this silently before writing)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before writing the post, reason through:
- What is the core insight in this dump?
- What tone matches this user's profile?
- What sentence rhythm should I use?
- What hook would work for their audience?
- Am I using vocabulary this specific person would actually use?
- Would they recognize their own voice in this post?
- If there was a rejection reason, am I actually fixing that specific thing?

CRITICAL: You MUST wrap your reasoning in XML tags exactly like this:
<reasoning>your thoughts here</reasoning>
Then output the post immediately after the closing tag. Never write "Reasoning:" as plain text outside the tags.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `My raw thoughts:\n\n${dump}` },
        ],
        temperature: 0.7,
        max_tokens: 900,
        reasoning_effort: 'none',
      }),
    });

    const data = await response.json();
    const fullResponse = data.choices?.[0]?.message?.content?.trim();

    if (!fullResponse) {
      return NextResponse.json({ error: 'No post generated' }, { status: 500 });
    }

    // Extract reasoning and post separately
    const reasoningMatch = fullResponse.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : null;
    const post = fullResponse
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .trim();

    return NextResponse.json({ post, reasoning });

  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}