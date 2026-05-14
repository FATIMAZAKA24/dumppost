'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Preload() {
  const [dark, setDark] = useState(true);
  const [name, setName] = useState('');
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('dp-theme') || 'dark';
    setDark(saved === 'dark');
    document.documentElement.setAttribute('data-theme', saved);
    setName(localStorage.getItem('dp-name') || '');

    const timers = [
      setTimeout(() => setPhase(1), 2000),
      setTimeout(() => router.push('/onboarding/questions'), 4500),
    ];
    return () => timers.forEach(clearTimeout);
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

        <div style={{ minHeight: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
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
            6 quick questions. No right or wrong answers. Just talk to us like you would a friend.
          </p>
        </div>
      </div>
    </main>
  );
}