'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  // ADD THIS inside the component:
 useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) router.push('/dump');
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session) router.push('/dump');
  });

  return () => subscription.unsubscribe();
}, []);

  if (!mounted) return null;

  return (
    <main data-theme={dark ? 'dark' : 'light'} className="landing">
      <button className="theme-toggle" onClick={() => setDark(!dark)} aria-label="Toggle theme">
        {dark ? '🌙' : '☀️'}
      </button>
      <div className="glow" />
      <div className="content">
        <p className="wordmark">DumpPost</p>
        <h1 className="headline">
          Dump your thoughts.<br />
          <span className="accent">Post your story.</span>
        </h1>
        <p className="tagline">Your raw ideas → your voice → LinkedIn, effortlessly.</p>
        <div className="cta-group">
          <button className="cta-btn" onClick={() => router.push('/signup')}>Get started →</button>
          <span className="cta-sub">Free during beta · No card required</span>
        </div>
      </div>
    </main>
  );
}