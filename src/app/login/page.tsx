'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dump');
    }
  };

  return (
    <main data-theme={dark ? 'dark' : 'light'} className="landing">
      <button className="theme-toggle" onClick={() => setDark(!dark)}>
        {dark ? '🌙' : '☀️'}
      </button>

      <div className="glow" />

      <div className="content">
        <p className="wordmark" style={{ marginBottom: '40px' }}>DumpPost</p>

        <h1 className="headline" style={{ marginBottom: '8px', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
          Welcome back.
        </h1>

        <p className="tagline" style={{ marginBottom: '40px' }}>
          Sign in to your account.
        </p>

        <div className="auth-form">
          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />

          {error && <p className="auth-error">{error}</p>}

          <button
            className="cta-btn"
            onClick={handleLogin}
            disabled={!email || !password || loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>

          <p className="auth-switch">
            Don't have an account?{' '}
            <span className="auth-link" onClick={() => router.push('/signup')}>
              Sign up
            </span>
          </p>
        </div>
      </div>
    </main>
  );
}