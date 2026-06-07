import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const groqForm = new FormData();
    groqForm.append('file', file, 'recording.webm');
    groqForm.append('model', 'whisper-large-v3');
    groqForm.append('response_format', 'json');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: groqForm,
    });

    const data = await response.json();
    return NextResponse.json({ text: data.text });

  } catch (err) {
    console.error('Transcribe error:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}