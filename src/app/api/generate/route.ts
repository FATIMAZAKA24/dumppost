import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { dump, userId, previousOutput, lastRejectionReason } = await req.json();

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
      .limit(20);

    const { data: edits } = await supabaseAdmin
      .from('interactions')
      .select('generated_output, edits_made')
      .eq('user_id', userId)
      .eq('user_response', 'edited')
      .not('edits_made', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    const rejectionContext = rejections?.length
      ? rejections.map((r: { rejection_reason: string }) => `- ${r.rejection_reason}`).join('\n')
      : null;

    const editContext = edits?.length
      ? edits.map((e: { generated_output: string; edits_made: string }, i: number) =>
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

    const userTypeGuidance =
      user?.user_type === 'jobseeker'
        ? `This person is actively job seeking. They need to come across as accomplished, intentional, and worth hiring — without sounding desperate or performative.`
        : user?.user_type === 'student'
        ? `This person is a student building their professional presence. They should sound authentic and curious, not like they're trying to seem more senior than they are.`
        : `This person is a working professional sharing real experience from the field.`;

    const systemPrompt = `You are DumpPost — a ghostwriter that turns raw, unfiltered thoughts into LinkedIn posts that sound exactly like the person who wrote them.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHO YOU ARE WRITING FOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${user?.name || 'Unknown'}
${userTypeGuidance}

Voice profile extracted from their onboarding:
${profileContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT THEY HAVE CORRECTED BEFORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${editContext
  ? `These are real edits this person made to previous posts. The gap between original and edited version is your clearest signal of their actual voice. Study what they changed and why:\n\n${editContext}`
  : 'No edits yet — rely on the voice profile.'}

${rejectionContext
  ? `They have also rejected posts for these reasons — do not repeat these patterns:\n${rejectionContext}`
  : ''}

${lastRejectionReason
  ? `The specific reason they rejected the last version: "${lastRejectionReason}". Fix this directly.`
  : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR CORE TASK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The person has dumped their raw thoughts below. Your job is to write a LinkedIn post that:

1. Says what THEY said — not what you think they should say. The dump is the source of truth. Do not add claims, achievements, or details that are not in the dump or clearly implied by it. If they said "I", do not write "we". If they expressed uncertainty, the post should reflect that — do not turn doubt into confidence.

2. Sounds like THEM — use the voice profile to match their natural rhythm, vocabulary, and tone. The profile tells you HOW they speak, not WHAT to say.

3. Feels like something they would actually post — when they read it back, they should think "yes, that's exactly what I meant, just said better." Not "this sounds like AI" or "I wouldn't say it like that."

4. Stops the scroll — the first line should earn the reader's attention without being clickbait or cringe.

5. Ends with 3–5 relevant hashtags on a new line.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEFORE YOU OUTPUT — CHECK YOURSELF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before returning the post, silently ask yourself:

- Does every claim in this post trace back to something in the dump?
- Does the tone match this person's voice profile?
- Would this person read it and say "yes, that's me"?
- Is there anything that sounds like generic LinkedIn content?
- Did I add "we" when they only said "I"?
- Did I add confidence where they expressed uncertainty?
- Does it start with a strong hook that isn't cringe or cliché?

If any answer is no — rewrite that part. Only output the final version.

Output ONLY the post. No intro, no explanation, no "here's your post". Start with the first word of the post itself.

${previousOutput ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PREVIOUS VERSION (improve this, don't start from scratch)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${previousOutput}` : ''}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here are my raw thoughts:\n\n${dump}` },
        ],
        temperature: 0.72,
        max_tokens: 1000,
        reasoning_effort: 'none',
      }),
    });

    const data = await response.json();
    const fullResponse = data.choices?.[0]?.message?.content?.trim();

    if (!fullResponse) {
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