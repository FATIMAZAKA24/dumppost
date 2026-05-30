import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { dump, name, userType, answers, interactionHistory } = await req.json();

    const employedQuestions = [
      "What are you working on right now?",
      "What's the most interesting part of it?",
      "What's been giving you the most trouble with it?",
      "Who do you want reading your posts — and what do you want them to think when they do?",
      "What part of your work do you actually enjoy? Feel free to ramble a bit.",
      "Anything specific you want DumpPost to keep in mind? Or we can just learn as we go.",
    ];

    const studentQuestions = [
      "What are you currently studying or learning?",
      "What's the most interesting thing you've come across recently in your field?",
      "What's something you've been trying to figure out or struggling with?",
      "Who do you want reading your posts — and what do you want them to think when they do?",
      "What part of your field do you actually enjoy? Feel free to ramble a bit.",
      "Anything specific you want DumpPost to keep in mind? Or we can just learn as we go.",
    ];

    const questions = userType === 'student' ? studentQuestions : employedQuestions;

    const onboardingConversation = answers?.length > 0
      ? answers.map((a: string, i: number) => `Q: ${questions[i]}\nA: ${a}`).join('\n\n')
      : 'No onboarding answers available.';

    const acceptedPosts = interactionHistory
      ?.filter((i: { response: string }) => i.response === 'accepted')
      ?.slice(-3)
      ?.map((i: { post: string }, idx: number) => `Past accepted post ${idx + 1}:\n${i.post}`)
      ?.join('\n\n') || '';

    const systemPrompt = `You are DumpPost — an AI that converts raw, unfiltered thoughts into authentic, personalised LinkedIn posts.

Your core job: make the post sound exactly like THIS person, not a generic LinkedIn voice.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — EXTRACT SIGNALS FROM ONBOARDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Read the onboarding conversation holistically. Extract the following signals:
- Domain and role
- Enthusiasm level (how excited do they sound?)
- Technical depth (how technical is their vocabulary?)
- Emotional honesty (how vulnerable are they willing to be?)
- Target audience and how they want to be perceived
- Passion areas (what genuinely lights them up?)
- Natural sentence rhythm (short punchy? Long flowing?)
- Real vocabulary (what words do THEY use, not what sounds professional?)
- Personality type (analytical? Storyteller? Straight shooter? Reflective?)

USER PROFILE:
Name: ${name || 'Unknown'}
Type: ${userType === 'student' ? 'Student' : 'Working Professional'}

ONBOARDING CONVERSATION:
${onboardingConversation}

${acceptedPosts ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POSTS THIS USER HAS ACCEPTED BEFORE (use as voice reference):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${acceptedPosts}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — GENERATE THE POST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Now write a LinkedIn post based on their raw dump below.

RULES:
- Write in first person as the user — their voice, their words
- Hook first — first line must stop the scroll
- Never start with "I" as the opening word
- Structure: hook → insight or story → takeaway → optional question to audience
- Length: 150–250 words
- No hollow buzzwords ("game-changer", "excited to announce", "humbled")
- No corporate fluff — if they're casual, be casual. If they're precise, be precise.
- Match their natural sentence rhythm from the onboarding answers
- Add 3–5 relevant hashtags at the end on a new line
- Output ONLY the LinkedIn post — no preamble, no explanation, no title`;

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
        temperature: 0.75,
        max_tokens: 700,
      }),
    });

    const data = await response.json();
    const post = data.choices?.[0]?.message?.content?.trim();

    if (!post) {
      return NextResponse.json({ error: 'No post generated' }, { status: 500 });
    }

    return NextResponse.json({ post });

  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}