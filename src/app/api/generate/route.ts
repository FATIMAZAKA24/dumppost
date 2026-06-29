import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { dump, userId, previousOutput } = await req.json();

    // Fetch extracted profile signals from DB
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Fetch user basic info
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('name, user_type')
      .eq('id', userId)
      .single();

    // Fetch last 5 rejection reasons
    const { data: rejections } = await supabaseAdmin
      .from('interactions')
      .select('rejection_reason')
      .eq('user_id', userId)
      .eq('user_response', 'rejected')
      .not('rejection_reason', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch last 3 edited posts
    const { data: edits } = await supabaseAdmin
      .from('interactions')
      .select('generated_output, edits_made')
      .eq('user_id', userId)
      .eq('user_response', 'edited')
      .not('edits_made', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    const rejectionContext = rejections?.length
      ? rejections.map((r: {rejection_reason: string}) => `- ${r.rejection_reason}`).join('\n')
      : null;

    const editContext = edits?.length
      ? edits.map((e: {generated_output: string; edits_made: string}, i: number) =>
          `Edit ${i + 1}:\nOriginal: ${e.generated_output?.slice(0, 200)}...\nEdited to: ${e.edits_made?.slice(0, 200)}...`
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
Personality type: ${profile.personality_type || 'unknown'}` : 'No profile available.';

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
LAYER 3 — WHAT TO AVOID (REJECTION REASONS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rejectionContext ? `User has rejected posts for these reasons. Do NOT repeat these:\n${rejectionContext}` : 'No rejections yet.'}

LAYER 4 — DUMPPOST RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Write in first person as the user — their voice, their words
- Hook first — first line must stop the scroll
- Never start with "I" as the opening word
- Never use "Excited to share", "Humbled", "Game-changer", "Thrilled"
- No bullet points unless their structure_preference suggests it
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

${previousOutput ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAYER 5 — PREVIOUS VERSION (REFINE THIS, DON'T REWRITE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The user rejected this version. Keep what worked, fix what didn't based on their rejection reason:

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


Output your reasoning as: <reasoning>your thoughts here</reasoning>
Then output the post.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `My raw thoughts:\n\n${dump}` },
        ],
        temperature: 0.6,
        max_tokens: 900,
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
    const post = fullResponse.replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '').trim();

    return NextResponse.json({ post, reasoning });

  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}