'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Intro() {
  const [name, setName] = useState('');
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('dp-theme') || 'dark';
    setDark(saved === 'dark');
    document.documentElement.setAttribute('data-theme', saved);
    setName(localStorage.getItem('dp-name') || '');
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
        <p className="wordmark" style={{ marginBottom: '40px' }}>DumpPost</p>

        <h1 className="headline" style={{ marginBottom: '16px' }}>
          {name ? `You're all set, ${name}.` : "You're all set."}
        </h1>

        <p className="tagline" style={{ marginBottom: '12px' }}>
          We're going to ask you 6 short questions.
        </p>

        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '0.88rem',
          fontWeight: 300,
          color: 'var(--text-muted)',
          marginBottom: '48px',
          maxWidth: '380px',
          lineHeight: '1.8',
          textAlign: 'center',
          letterSpacing: '0.02em'
        }}>
          No right or wrong answers. Just talk to us like you would to a friend.
          The more honest you are, the better your posts will sound like <em>you</em>.
        </p>

        <button className="cta-btn" onClick={() => router.push('/onboarding/questions')}>
          Let's go →
        </button>
      </div>
    </main>
  );
}