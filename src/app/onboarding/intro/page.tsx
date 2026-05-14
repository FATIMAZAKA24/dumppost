'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Intro() {
  const [name, setName] = useState('');
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('dp-theme') || 'dark';
    setDark(saved === 'dark');
    document.documentElement.setAttribute('data-theme', saved);
    setName(localStorage.getItem('dp-name') || '');

    const timers = [
      setTimeout(() => setStep(1), 400),
      setTimeout(() => setStep(2), 1200),
      setTimeout(() => setStep(3), 2000),
      setTimeout(() => setStep(4), 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const theme = dark ? 'dark' : 'light';
    localStorage.setItem('dp-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [dark, mounted]);

  if (!mounted) return null;

  return (
    <main data-theme={dark ? 'dark' : 'light'} className="landing">
      <button className="theme-toggle" onClick={() => setDark(!dark)}>
        {dark ? '🌙' : '☀️'}
      </button>

      <div className="glow" />

      <div className="content">
        <p className="wordmark" style={{ marginBottom: '48px' }}>DumpPost</p>

        <div style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <h1
            className="headline"
            style={{
              marginBottom: '8px',
              opacity: step >= 1 ? 1 : 0,
              transform: step >= 1 ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 0.6s ease',
            }}
          >
            {name ? `You're all set, ${name}.` : "You're all set."}
          </h1>

          <p
            className="tagline"
            style={{
              marginBottom: '4px',
              opacity: step >= 2 ? 1 : 0,
              transform: step >= 2 ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 0.6s ease',
            }}
          >
            6 quick questions. No right or wrong answers.
          </p>

          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.88rem',
              fontWeight: 300,
              color: 'var(--text-muted)',
              maxWidth: '360px',
              lineHeight: '1.8',
              textAlign: 'center',
              letterSpacing: '0.02em',
              opacity: step >= 3 ? 1 : 0,
              transform: step >= 3 ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 0.6s ease',
              marginBottom: '32px',
            }}
          >
            Just talk to us like you would a friend. The more honest you are, the better your posts will sound like <em>you</em>.
          </p>

          <button
            className="cta-btn"
            onClick={() => router.push('/onboarding/questions')}
            style={{
              opacity: step >= 4 ? 1 : 0,
              transform: step >= 4 ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 0.6s ease',
              pointerEvents: step >= 4 ? 'auto' : 'none',
            }}
          >
            Let's go →
          </button>
        </div>
      </div>
    </main>
  );
}