'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Login() {
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) {
  setError(error.message);
  setLoading(false);
} else {
  if (data.user) {
    localStorage.setItem('dp-user-id', data.user.id);

    // Fetch user data from DB
    const { data: userData } = await supabase
      .from('users')
      .select('name, user_type')
      .eq('id', data.user.id)
      .single();

    if (userData) {
      localStorage.setItem('dp-name', userData.name || '');
      localStorage.setItem('dp-type', userData.user_type || '');
    }

    // Check if onboarding done
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, onboarding_answers')
      .eq('user_id', data.user.id)
      .single();

    if (profile) {
      localStorage.setItem('dp-answers', JSON.stringify(profile.onboarding_answers || []));
      router.push('/dump');
    } else {
      router.push('/onboarding');
    }
  }
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
            autoFocus
          />
          <div className="auth-password-wrap">
            <input
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
              <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`} />
            </button>
          </div>
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
            <span className="auth-link" onClick={() => router.push('/signup')}>Sign up</span>
          </p>
        </div>
      </div>
    </main>
  );
}