import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId, answers, userType } = await req.json();

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
    const conversation = answers.map((a: string, i: number) => `Q: ${questions[i]}\nA: ${a}`).join('\n\n');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: `You are a voice profiling system. Extract signals from a user's onboarding answers and return ONLY a JSON object with no preamble, no markdown, no backticks. Just raw JSON.`
          },
          {
            role: 'user',
            content: `Extract the following signals from these onboarding answers and return as JSON:

ONBOARDING:
${conversation}

IMPORTANT INFERENCE NOTE:
Onboarding answers are conversational by nature — people naturally 
write longer when answering questions directly. Do not mistake 
conversational answer length for the user's actual writing style.

Return this exact JSON structure (fill in what you can infer, use null for anything unclear):
{
  "domain": "their field/industry",
  "role": "their job title or role",
  "project_type": "type of work they do",
  "baseline_confidence": "high/medium/low based on how they talk about their work",
  "enthusiasm_level": "high/medium/low based on excitement in answers",
  "technical_depth": "high/medium/low based on vocabulary used",
  "explanation_style": "how they explain things - simple/technical/story-driven/etc",
  "emotional_honesty": "high/medium/low - how vulnerable they are",
  "problem_solving_style": "how they approach problems",
  "vulnerability_level": "high/medium/low",
  "audience": "who they want reading their posts",
  "posting_goal": "what they want to achieve on LinkedIn",
  "desired_perception": "how they want to be perceived",
  "passion_areas": "what genuinely excites them",
  "sentence_rhythm": "short-punchy/long-flowing/mixed",
  "structure_preference": "how they naturally structure thoughts",
  "real_vocabulary": "key words and phrases they actually use",
  "explicit_preferences": "any specific things they mentioned wanting",
  "personality_type": "analytical/storyteller/straight-shooter/reflective/etc",
  "self_awareness": "how self-aware they seem about their own work and communication style",
  "ai_tool_relationship": "how comfortable they seem with AI tools based on their answers"
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim();

    if (!raw) return NextResponse.json({ error: 'No extraction' }, { status: 500 });

    const clean = raw.replace(/```json|```/g, '').trim();
    const signals = JSON.parse(clean);

    // Store BOTH the extracted signals AND the raw onboarding answers + questions
      await supabaseAdmin
    .from('user_profiles')
    .upsert({
      user_id: userId,
      ...signals,
      onboarding_answers: answers,
      onboarding_questions: questions,
      user_type: userType,
    }, { onConflict: 'user_id' });

    return NextResponse.json({ success: true, signals });

  } catch (err) {
    console.error('Extract profile error:', err);
    return NextResponse.json({ error: 'Failed to extract profile' }, { status: 500 });
  }
}