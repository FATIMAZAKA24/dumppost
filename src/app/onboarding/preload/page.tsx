'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Preload() {
  const [dark, setDark] = useState(true);
  const [name, setName] = useState('');
  const [phase, setPhase] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('dp-theme') || 'dark';
    setDark(saved === 'dark');
    document.documentElement.setAttribute('data-theme', saved);
    setName(localStorage.getItem('dp-name') || '');

    const timer = setTimeout(() => setPhase(1), 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main data-theme={dark ? 'dark' : 'light'} className="landing">
      <div className="glow" />
      <div className="content">
        <p className="wordmark" style={{ marginBottom: '48px' }}>DumpPost</p>

        <div className="loading-dots" style={{ marginBottom: '36px' }}>
          <span className="dump-loading-dot" />
          <span className="dump-loading-dot" />
          <span className="dump-loading-dot" />
        </div>

        <div style={{ minHeight: '80px', position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.4rem',
            fontWeight: 300,
            fontStyle: 'italic',
            color: 'var(--text)',
            textAlign: 'center',
            opacity: phase === 0 ? 1 : 0,
            transform: phase === 0 ? 'translateY(0)' : 'translateY(-10px)',
            transition: 'all 0.5s ease',
            position: 'absolute',
          }}>
            {name ? `Wonderful to meet you, ${name}.` : 'Wonderful to meet you.'}
          </p>

          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.88rem',
            fontWeight: 300,
            color: 'var(--text-muted)',
            textAlign: 'center',
            maxWidth: '340px',
            lineHeight: '1.8',
            letterSpacing: '0.02em',
            opacity: phase === 1 ? 1 : 0,
            transform: phase === 1 ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.5s ease',
            position: 'absolute',
          }}>
            Tell us how you actually think. The messier, the better.
          </p>
        </div>

        <button
          className="cta-btn"
          onClick={() => router.push('/onboarding/questions')}
          style={{
            marginTop: '48px',
            opacity: phase === 1 ? 1 : 0,
            transition: 'opacity 0.5s ease',
            pointerEvents: phase === 1 ? 'auto' : 'none',
          }}
        >
          Let's go →
        </button>
      </div>
    </main>
  );
}