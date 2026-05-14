'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserType() {
  const [selected, setSelected] = useState<'employed' | 'student' | null>(null);
  const [name, setName] = useState('');
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('dp-theme') || 'dark';
    setDark(saved === 'dark');
    document.documentElement.setAttribute('data-theme', saved);
    const savedName = localStorage.getItem('dp-name') || '';
    setName(savedName);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const theme = dark ? 'dark' : 'light';
    localStorage.setItem('dp-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [dark, mounted]);

  if (!mounted) return null;

  const handleContinue = () => {
    if (!selected) return;
    localStorage.setItem('dp-type', selected);
    router.push('/onboarding/preload');
  };

  return (
    <main data-theme={dark ? 'dark' : 'light'} className="landing">
      <button
        className="theme-toggle"
        onClick={() => setDark(!dark)}
        aria-label="Toggle theme"
      >
        {dark ? '🌙' : '☀️'}
      </button>

      <div className="glow" />

      <div className="content">
        <p className="wordmark">DumpPost</p>

        <h1 className="headline" style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontFamily: 'DM Sans, sans-serif', fontWeight: 300, letterSpacing: '0.04em' }}>
            Wonderful to meet you, {name || 'there'}.
        </span>
        <span className="accent">What describes you?</span>
        </h1>

        <p className="tagline" style={{ marginBottom: '40px' }}>
          This helps us ask the right questions.
        </p>

        <div className="type-options">
          <button
            className={`type-card ${selected === 'employed' ? 'selected' : ''}`}
            onClick={() => setSelected('employed')}
          >
            <span className="type-label">Working Professional</span>
            <span className="type-desc">I'm employed or running a business</span>
          </button>

          <button
            className={`type-card ${selected === 'student' ? 'selected' : ''}`}
            onClick={() => setSelected('student')}
          >
            <span className="type-label">Student</span>
            <span className="type-desc">I'm studying or in university</span>
          </button>
        </div>

        <button
          className="cta-btn"
          onClick={handleContinue}
          disabled={!selected}
          style={{ marginTop: '32px' }}
        >
          Continue →
        </button>
      </div>
    </main>
  );
}