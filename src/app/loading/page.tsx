'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const messages = [
  'Reading between the lines...',
  'Learning how you think...',
  'Building your voice profile...',
  'Getting your workspace ready...',
];

export default function Loading() {
  const [dark, setDark] = useState(true);
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('dp-theme') || 'dark';
    setDark(saved === 'dark');
    document.documentElement.setAttribute('data-theme', saved);

    let i = 0;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        i++;
        if (i < messages.length) {
          setMsgIndex(i);
          setVisible(true);
        }
      }, 400);
    }, 1400);

    const nav = setTimeout(() => {
      router.push('/dump');
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(nav);
    };
  }, [router]);

  return (
    <main data-theme={dark ? 'dark' : 'light'} className="landing">
      <div className="glow" />
      <div className="content">
        <p className="wordmark" style={{ marginBottom: '48px' }}>DumpPost</p>
        <div className="loading-dots" style={{ marginBottom: '32px' }}>
          <span className="dump-loading-dot" />
          <span className="dump-loading-dot" />
          <span className="dump-loading-dot" />
        </div>
        <p
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '1.3rem',
            fontWeight: 300,
            fontStyle: 'italic',
            color: 'var(--text-muted)',
            letterSpacing: '0.02em',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 0.4s ease',
            textAlign: 'center',
          }}
        >
          {messages[msgIndex]}
        </p>
      </div>
    </main>
  );
}