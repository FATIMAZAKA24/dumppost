'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Onboarding() {
  const [name, setName] = useState('');
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('dp-theme') || 'dark';
    setDark(saved === 'dark');
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const theme = dark ? 'dark' : 'light';
    localStorage.setItem('dp-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [dark, mounted]);

  if (!mounted) return null;

 const handleContinue = async () => {
  if (name.trim().length === 0) return;
  const trimmed = name.trim();
  localStorage.setItem('dp-name', trimmed);

  // Update Supabase immediately when name is set
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await supabase.from('users').upsert({
      id: session.user.id,
      email: session.user.email,
      name: trimmed,
    }, { onConflict: 'id' });
  }

  router.push('/onboarding/type');
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
          What should we<br />
          <span className="accent">call you?</span>
        </h1>

        {/* <p className="tagline" style={{ marginBottom: '40px' }}>
          Just your first name is fine.
        </p> */}

        <div className="name-input-group">
          <input
            className="name-input"
            type="text"
            placeholder="Your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
            autoFocus
          />
          <button
            className="cta-btn"
            onClick={handleContinue}
            disabled={name.trim().length === 0}
          >
            Continue →
          </button>
        </div>
      </div>
    </main>
  );
}