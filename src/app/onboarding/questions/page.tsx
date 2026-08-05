'use client';
import { useVoiceInput } from '@/lib/useVoiceInput';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const employedQuestions = [
  "What are you working on right now? Explain it like you're texting a friend — don't make it sound impressive.",
  "What's the most interesting thing you've figured out recently? Could be tiny.",
  "What's been annoying you or slowing you down lately?",
  "What's an opinion you have about your field that people might push back on?",
  "What do you want people to think when they read your posts? Be honest.",
  "Write me two or three sentences the way you'd normally write — could be about anything at all.",
];

const studentQuestions = [
  "What are you learning right now? Explain it like you're texting a friend.",
  "What's something in your field that surprised or confused you recently?",
  "What's been the hardest part of where you are right now?",
  "What's an opinion you have that people in your field might disagree with?",
  "Who do you want reading your posts and what should they think?",
  "Write me two or three sentences the way you'd normally write — could be about anything at all.",
];

const jobseekerQuestions = [
  "What kind of work do you actually want to be doing? Not the polished answer — the real one.",
  "What's the most interesting thing you've built or worked on? Explain it simply.",
  "What's been the hardest part of your search so far?",
  "What's something about your field that people misunderstand?",
  "What do you want people to think when they read your posts?",
  "Write me two or three sentences the way you'd normally write — could be about anything at all.",
];

export default function Questions() {
  const { isRecording, transcribing, handleMicToggle } = useVoiceInput((text) => {
    setInput(prev => prev ? prev + ' ' + text : text);
  });
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [name, setName] = useState('');
  const [userType, setUserType] = useState<'employed' | 'student' | 'jobseeker'>('employed');
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('dp-theme') || 'dark';
    setDark(saved === 'dark');
    document.documentElement.setAttribute('data-theme', saved);
    setName(localStorage.getItem('dp-name') || '');
    const type = localStorage.getItem('dp-type') as 'employed' | 'student' | 'jobseeker';
    setUserType(type || 'employed');

    const autoResize = (e: Event) => {
      const el = e.target as HTMLTextAreaElement;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    };
    document.addEventListener('input', autoResize);
    return () => document.removeEventListener('input', autoResize);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const theme = dark ? 'dark' : 'light';
    localStorage.setItem('dp-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [dark, mounted]);

  if (!mounted) return null;
  if (redirecting) return null;

  const questions =
    userType === 'student' ? studentQuestions :
    userType === 'jobseeker' ? jobseekerQuestions :
    employedQuestions;

  const handleNext = async () => {
    if (input.trim().length === 0) return;
    const newAnswers = [...answers];
    newAnswers[current] = input.trim();
    setAnswers(newAnswers);
    setAnimating(true);

    if (current + 1 >= questions.length) {
      localStorage.setItem('dp-answers', JSON.stringify(newAnswers));
      setRedirecting(true);
      setInput('');
      router.push('/loading');

      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          const savedName = localStorage.getItem('dp-name') || '';
          const savedType = localStorage.getItem('dp-type') || 'employed';
          localStorage.setItem('dp-user-id', session.user.id);

          // Update users table and wait for it
          await supabase.from('users').upsert({
            id: session.user.id,
            email: session.user.email,
            name: savedName,
            user_type: savedType,
          }, { onConflict: 'id' });

          fetch('/api/extract-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: session.user.id,
              answers: newAnswers,
              userType: savedType,
            }),
          }).catch(console.error);

          supabase.from('user_profiles').upsert({
            user_id: session.user.id,
            onboarding_answers: newAnswers,
          });
        }
      });
   } else {
  setTimeout(() => {
    setInput(newAnswers[current + 1] || '');
    setAnimating(false);
    setCurrent(current + 1);
  }, 300);
}
  };

 const handleBack = () => {
  // Save current input before going back
  const newAnswers = [...answers];
  newAnswers[current] = input.trim();
  setAnswers(newAnswers);

  if (current === 0) {
    router.push('/onboarding/type');
  } else {
    setInput(newAnswers[current - 1] || '');
    setCurrent(current - 1);
  }
};

  return (
    <main data-theme={dark ? 'dark' : 'light'} className="landing">
      <button className="theme-toggle" onClick={() => setDark(!dark)}>
        {dark ? '🌙' : '☀️'}
      </button>

      <div className="glow" />

      <div className="questions-wrap">
        <p className="wordmark" style={{ marginBottom: '32px' }}>DumpPost</p>

        <button className="q-back-btn" onClick={handleBack}>← Back</button>

        <div className="progress-stepper-wrap">
          <div className="progress-stepper">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`progress-step ${i < current ? 'done' : i === current ? 'active' : ''}`}
              />
            ))}
          </div>
          <span className="progress-label">{current + 1} of {questions.length}</span>
        </div>

        <div className={`question-block ${animating ? 'fade-out' : 'fade-in'}`}>
          {current === 0 && (
            <p className="q-greeting"></p>
          )}
          <h2 className="q-text">{questions[current]}</h2>
        </div>

        <div className="q-input-wrap">
          <div className="q-textarea-wrap">
            <textarea
              className="q-textarea"
              placeholder="Type your answer here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleNext();
                }
              }}
              rows={3}
              autoFocus
            />
            <button
              className={`mic-btn-corner ${isRecording ? 'recording' : ''}`}
              onClick={handleMicToggle}
              disabled={transcribing}
            >
              <i className={`ti ${transcribing ? 'ti-loader' : isRecording ? 'ti-microphone-off' : 'ti-microphone'}`} />
            </button>
          </div>
          <button
            className="cta-btn"
            onClick={handleNext}
            disabled={input.trim().length === 0}
          >
            {current + 1 === questions.length ? 'Finish →' : 'Next →'}
          </button>
        </div>

        <p className="q-hint">Press Enter to continue · Shift+Enter for new line</p>
      </div>
    </main>
  );
}