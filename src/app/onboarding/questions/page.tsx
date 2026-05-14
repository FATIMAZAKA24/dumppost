'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

export default function Questions() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [name, setName] = useState('');
  const [userType, setUserType] = useState<'employed' | 'student'>('employed');
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('dp-theme') || 'dark';
    setDark(saved === 'dark');
    document.documentElement.setAttribute('data-theme', saved);
    setName(localStorage.getItem('dp-name') || '');
    const type = localStorage.getItem('dp-type') as 'employed' | 'student';
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

  const questions = userType === 'student' ? studentQuestions : employedQuestions;

  const handleNext = () => {
    if (input.trim().length === 0) return;
    const newAnswers = [...answers, input.trim()];
    setAnswers(newAnswers);
    setAnimating(true);

    setTimeout(() => {
      setInput('');
      setAnimating(false);
      if (current + 1 >= questions.length) {
        localStorage.setItem('dp-answers', JSON.stringify(newAnswers));
        router.push('/dump');
      } else {
        setCurrent(current + 1);
      }
    }, 300);
  };

  const progress = ((current) / questions.length) * 100;

  return (
    <main data-theme={dark ? 'dark' : 'light'} className="landing">
      <button className="theme-toggle" onClick={() => setDark(!dark)}>
        {dark ? '🌙' : '☀️'}
      </button>

      <div className="glow" />

      <div className="questions-wrap">
        <p className="wordmark" style={{ marginBottom: '32px' }}>DumpPost</p>

        <div className="progress-bar-wrap">
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-label">{current + 1} of {questions.length}</span>
        </div>

        <div className={`question-block ${animating ? 'fade-out' : 'fade-in'}`}>
          {current === 0 && (
            <p className="q-greeting">
              {/* {name ? `Hey ${name}, just a few quick questions.` : 'Just a few quick questions.'} */}
            </p>)
            }
          <h2 className="q-text">{questions[current]}</h2>
        </div>

        <div className="q-input-wrap">
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