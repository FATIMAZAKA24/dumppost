import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { dump } = await req.json();

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
            content: `You are a content classifier. Classify a raw thought dump into a LinkedIn post type and structure. Return ONLY raw JSON — no markdown, no backticks, no explanation.`,
          },
          {
            role: 'user',
            content: `Classify this raw thought dump:

"${dump}"

Post types:
- story: something happened, narrative arc
- lesson: learned something, sharing the insight  
- opinion: a take on something in the field
- reflection: looking back, personal
- tutorial: how to do something step by step
- observation: noticed something interesting
- announcement: sharing news about something
- behind-the-scenes: showing the process of building/working

Return this exact JSON:
{
  "post_type": "one of the types above",
  "core_message": "one sentence — what is the person actually trying to say?",
  "core_emotion": "one word — what emotion is underneath this dump?",
  "suggested_structure": "observation→analysis→question | story→conflict→lesson | opinion→evidence→conclusion | experience→reflection→advice | question→exploration→open-end",
  "hook_angle": "one sentence — what would make someone stop scrolling for this specific post?",
  "confidence": "high | medium | low"
}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';
    const clean = raw.replace(/```json|```/g, '').trim();

    try {
      const classification = JSON.parse(clean);
      return NextResponse.json({ success: true, classification });
    } catch {
      // If parsing fails, return a safe default
      return NextResponse.json({
        success: true,
        classification: {
          post_type: 'observation',
          core_message: dump.slice(0, 100),
          core_emotion: 'neutral',
          suggested_structure: 'observation→analysis→question',
          hook_angle: null,
          confidence: 'low',
        },
      });
    }

  } catch (err) {
    console.error('Classify error:', err);
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 });
  }
}