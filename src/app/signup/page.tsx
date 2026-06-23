'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    // Add this:
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dump');
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const theme = dark ? 'dark' : 'light';
    localStorage.setItem('dp-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [dark, mounted]);

  if (!mounted) return null;

  const handleSignup = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      router.push('/onboarding');
    } else {
      setError('Please check your email to confirm your account.');
      setLoading(false);
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
          Create your account.
        </h1>
        <p className="tagline" style={{ marginBottom: '40px' }}>
          Free during beta. No card required.
        </p>
        <div className="auth-form">
          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
            autoComplete="off"
            autoFocus
          />
          <div className="auth-password-wrap">
            <input
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
              autoComplete="new-password"
            />
            <button className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
              <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`} />
            </button>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button
            className="cta-btn"
            onClick={handleSignup}
            disabled={!email || !password || loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Creating account...' : 'Get started →'}
          </button>
          <p className="auth-switch">
            Already have an account?{' '}
            <span className="auth-link" onClick={() => router.push('/login')}>Sign in</span>
          </p>
        </div>
      </div>
    </main>
  );
}