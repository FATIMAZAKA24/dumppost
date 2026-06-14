'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const DUMP_TEXT =
  "3 yrs at startup. built entire ML pipeline from scratch. no playbook, no senior to ask. just shipped. never talked abt it on linkedin. probably should.";

const POST_TEXT =
`3 years ago I joined a 4-person startup as their first ML engineer.

No playbook. No senior to ask.
Just a problem and a deadline.

I built the entire screening pipeline from scratch.

Never posted about it. Just shipped.

Here's what building in silence taught me.`;

type DemoPhase = 'typing-dump' | 'generating' | 'typing-post' | 'done';

function DemoAnimation() {
  const [dumpDisplay, setDumpDisplay] = useState('');
  const [postDisplay, setPostDisplay] = useState('');
  const [phase, setPhase] = useState<DemoPhase>('typing-dump');
  const [actionsVisible, setActionsVisible] = useState(false);
  const [genWidth, setGenWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    function reset() {
      if (cancelled) return;
      setDumpDisplay('');
      setPostDisplay('');
      setPhase('typing-dump');
      setActionsVisible(false);
      setGenWidth(0);
      typeD(0);
    }

    function typeD(idx: number) {
      if (cancelled) return;
      if (idx <= DUMP_TEXT.length) {
        setDumpDisplay(DUMP_TEXT.slice(0, idx));
        const delay = idx < 4 ? 130 : idx < 15 ? 75 : 36;
        timerRef.current = setTimeout(() => typeD(idx + 1), delay);
      } else {
        timerRef.current = setTimeout(startGen, 600);
      }
    }

    function startGen() {
      if (cancelled) return;
      setPhase('generating');
      setGenWidth(100);
      timerRef.current = setTimeout(showPost, 2400);
    }

    function showPost() {
      if (cancelled) return;
      setPhase('typing-post');
      setGenWidth(0);
      let pi = 0;
      function typeP() {
        if (cancelled) return;
        if (pi <= POST_TEXT.length) {
          setPostDisplay(POST_TEXT.slice(0, pi));
          pi++;
          timerRef.current = setTimeout(typeP, 15);
        } else {
          setPhase('done');
          setActionsVisible(true);
          timerRef.current = setTimeout(reset, 5000);
        }
      }
      typeP();
    }

    timerRef.current = setTimeout(reset, 400);
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dot1 = phase === 'typing-dump';
  const dot2 = phase === 'generating';
  const dot3 = phase === 'typing-post' || phase === 'done';

  return (
    <div className="dp-demo">
      <span className="dp-dlabel">DUMP</span>
      <div className={`dp-dbox${phase === 'typing-dump' ? ' act' : ''}`}>
        <div className="dp-dtext">
          {dumpDisplay}
          {phase === 'typing-dump' && <span className="dp-cur" />}
        </div>
      </div>

      <div className="dp-grow">
        <span className={`dp-grlabel${phase === 'generating' ? ' vis' : ''}`}>GENERATING</span>
        <div className="dp-grwrap">
          <div
            className="dp-grbar"
            style={{
              width: `${genWidth}%`,
              transition: genWidth === 100 ? 'width 2.2s linear' : 'none',
            }}
          />
        </div>
      </div>

      <div className="dp-arrow">↓</div>

      <span className="dp-dlabel">YOUR POST</span>
      <div className={`dp-dpost${dot3 ? ' vis' : ''}`}>
        <div className="dp-ptext" style={{ whiteSpace: 'pre-line' }}>
          {postDisplay}
          {phase === 'typing-post' && <span className="dp-cur" />}
        </div>
        <div className="dp-pacts">
          <span className={`dp-pa dp-cp${actionsVisible ? ' vis' : ''}`}>COPY</span>
          <span className={`dp-pa${actionsVisible ? ' vis' : ''}`} style={{ transitionDelay: '0.1s' }}>REFINE</span>
          <span className={`dp-pa${actionsVisible ? ' vis' : ''}`} style={{ transitionDelay: '0.2s' }}>RETRY</span>
        </div>
      </div>

      <div className="dp-dots">
        <div className={`dp-dot${dot1 ? ' on' : ''}`} />
        <div className={`dp-dot${dot2 ? ' on' : ''}`} />
        <div className={`dp-dot${dot3 ? ' on' : ''}`} />
      </div>
    </div>
  );
}

interface AuthPageProps {
  initialMode?: 'signup' | 'signin';
}

export default function AuthPage({ initialMode = 'signup' }: AuthPageProps) {
  const [mode, setMode] = useState<'signup' | 'signin'>(initialMode);
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

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      localStorage.setItem('dp-user-id', data.user.id);
      const { data: userData } = await supabase.from('users').select('name, user_type').eq('id', data.user.id).single();
      if (userData) {
        localStorage.setItem('dp-name', userData.name || '');
        localStorage.setItem('dp-type', userData.user_type || '');
      }
      const { data: profile } = await supabase.from('user_profiles').select('onboarding_answers').eq('user_id', data.user.id).single();
      if (profile?.onboarding_answers) {
        localStorage.setItem('dp-answers', JSON.stringify(profile.onboarding_answers));
        router.push('/dump');
      } else {
        router.push('/onboarding');
      }
    }
    setLoading(false);
  };

  const handleSubmit = () => {
    if (mode === 'signup') handleSignup();
    else handleLogin();
  };

  const switchMode = (m: 'signup' | 'signin') => {
    setMode(m);
    setError('');
    setEmail('');
    setPassword('');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400&display=swap');

        /* ── Auth-specific theme tokens ── */
        /* These extend your existing :root[data-theme] vars with left-panel needs */

        [data-theme='dark'] {
          --auth-left-bg: #0b0b0b;
          --auth-left-border: #1c1c1c;
          --auth-demo-box-bg: #0f0f0f;
          --auth-demo-box-border: #1c1c1c;
          --auth-demo-box-active: #2e4d2e;
          --auth-demo-text: #484848;
          --auth-demo-post-text: #686868;
          --auth-demo-pa-border: #1c1c1c;
          --auth-demo-pa-color: #2a2a2a;
          --auth-demo-label: #272727;
          --auth-demo-logo: #383838;
          --auth-demo-headline: #ddddd5;
          --auth-demo-tagline: #303030;
          --auth-demo-arrow: #1e1e1e;
          --auth-demo-bar-bg: #161616;
          --auth-dot-bg: #181818;
          --auth-accent: #8fba60;
        }

        [data-theme='light'] {
          --auth-left-bg: #eeeae0;
          --auth-left-border: #d8d4c8;
          --auth-demo-box-bg: #e8e4d8;
          --auth-demo-box-border: #d0ccc0;
          --auth-demo-box-active: #7a9a50;
          --auth-demo-text: #888880;
          --auth-demo-post-text: #666660;
          --auth-demo-pa-border: #c8c4b8;
          --auth-demo-pa-color: #888880;
          --auth-demo-label: #aaa89e;
          --auth-demo-logo: #aaa89e;
          --auth-demo-headline: #2a2a22;
          --auth-demo-tagline: #888880;
          --auth-demo-arrow: #c0bcb0;
          --auth-demo-bar-bg: #d0ccc0;
          --auth-dot-bg: #d0ccc0;
          --auth-accent: #5a8a2e;
        }

        .dp-auth-root {
          min-height: 100dvh;
          display: flex;
          background: var(--bg);
          transition: background 0.3s ease;
        }

        /* ── Theme toggle ── */
        .dp-theme-btn {
          position: fixed;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          z-index: 100;
          line-height: 1;
          padding: 4px;
          opacity: 0.5;
          transition: opacity 0.2s;
        }
        .dp-theme-btn:hover { opacity: 1; }

        /* ── LEFT PANEL ── */
        .dp-left {
          display: none;
          width: 55%;
          background: var(--auth-left-bg);
          border-right: 0.5px solid var(--auth-left-border);
          flex-direction: column;
          padding: 32px 36px;
          min-height: 100dvh;
          transition: background 0.3s ease, border-color 0.3s ease;
        }

        .dp-left-logo {
          font-size: 9px;
          letter-spacing: 5px;
          color: var(--auth-demo-logo);
          font-weight: 300;
          margin-bottom: 20px;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.3s ease;
        }

        .dp-left-headline {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          line-height: 1.1;
          font-weight: 300;
          color: var(--auth-demo-headline);
          margin-bottom: 8px;
          transition: color 0.3s ease;
        }

        .dp-left-headline em {
          color: var(--auth-accent);
          font-style: italic;
          transition: color 0.3s ease;
        }

        .dp-left-tagline {
          font-size: 11px;
          color: var(--auth-demo-tagline);
          font-weight: 300;
          letter-spacing: 0.3px;
          margin-bottom: 20px;
          transition: color 0.3s ease;
        }

        /* ── Demo ── */
        .dp-demo {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-height: 0;
        }

        .dp-dlabel {
          font-size: 8px;
          letter-spacing: 2.5px;
          color: var(--auth-demo-label);
          font-family: 'DM Sans', sans-serif;
          transition: color 0.3s ease;
        }

        .dp-dbox {
          background: var(--auth-demo-box-bg);
          border: 0.5px solid var(--auth-demo-box-border);
          border-radius: 5px;
          padding: 10px 13px;
          transition: border-color 0.5s, background 0.3s ease;
        }

        .dp-dbox.act { border-color: var(--auth-demo-box-active); }

        .dp-dtext {
          font-size: 10.5px;
          color: var(--auth-demo-text);
          line-height: 1.7;
          min-height: 38px;
          font-weight: 300;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.3s ease;
        }

        .dp-cur {
          display: inline-block;
          width: 1.5px;
          height: 11px;
          background: var(--auth-accent);
          vertical-align: middle;
          margin-left: 1px;
          animation: dp-blink 1s step-end infinite;
          transition: background 0.3s ease;
        }

        @keyframes dp-blink { 0%,100% { opacity:1; } 50% { opacity:0; } }

        .dp-grow {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 12px;
          margin: 1px 0;
        }

        .dp-grlabel {
          font-size: 7.5px;
          letter-spacing: 1.5px;
          color: var(--auth-demo-label);
          opacity: 0;
          transition: opacity 0.3s, color 0.3s ease;
          white-space: nowrap;
          font-family: 'DM Sans', sans-serif;
        }

        .dp-grlabel.vis { opacity: 1; }

        .dp-grwrap {
          flex: 1;
          height: 0.5px;
          background: var(--auth-demo-bar-bg);
          overflow: hidden;
          transition: background 0.3s ease;
        }

        .dp-grbar {
          height: 100%;
          background: var(--auth-accent);
          width: 0%;
          transition: background 0.3s ease;
        }

        .dp-arrow {
          text-align: center;
          font-size: 8px;
          color: var(--auth-demo-arrow);
          letter-spacing: 1px;
          transition: color 0.3s ease;
        }

        .dp-dpost {
          background: var(--auth-demo-box-bg);
          border: 0.5px solid var(--auth-demo-box-border);
          border-radius: 5px;
          padding: 10px 13px;
          opacity: 0;
          transition: opacity 0.5s, border-color 0.5s, background 0.3s ease;
          flex: 1;
        }

        .dp-dpost.vis { opacity: 1; border-color: var(--auth-demo-box-active); }

        .dp-ptext {
          font-size: 10.5px;
          color: var(--auth-demo-post-text);
          line-height: 1.7;
          font-weight: 300;
          font-family: 'DM Sans', sans-serif;
          transition: color 0.3s ease;
        }

        .dp-pacts { display: flex; gap: 5px; margin-top: 7px; }

        .dp-pa {
          font-size: 7.5px;
          letter-spacing: 1.5px;
          padding: 3px 8px;
          border: 0.5px solid var(--auth-demo-pa-border);
          border-radius: 3px;
          color: var(--auth-demo-pa-color);
          opacity: 0;
          transition: opacity 0.3s, border-color 0.3s ease, color 0.3s ease;
          font-family: 'DM Sans', sans-serif;
        }

        .dp-pa.dp-cp { border-color: var(--auth-demo-box-active); color: var(--auth-accent); }
        .dp-pa.vis { opacity: 1; }

        .dp-dots { display: flex; gap: 4px; margin-top: 12px; }

        .dp-dot {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--auth-dot-bg);
          transition: all 0.4s, background 0.3s ease;
        }

        .dp-dot.on { width: 14px; border-radius: 2px; background: var(--auth-accent); }

        /* ── RIGHT PANEL ── */
        .dp-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 100dvh;
          position: relative;
          overflow: hidden;
          background: var(--bg);
          transition: background 0.3s ease;
        }

        .dp-mobile-logo {
          font-size: 10px;
          letter-spacing: 5px;
          color: var(--text-muted);
          font-weight: 300;
          text-align: center;
          margin-bottom: 36px;
          font-family: 'DM Sans', sans-serif;
        }

        .dp-tabs {
          display: flex;
          border-bottom: 0.5px solid var(--border);
          margin-bottom: 28px;
          width: 100%;
        }

        .dp-tab {
          font-size: 9px;
          letter-spacing: 2.5px;
          color: var(--text-muted);
          padding: 0 0 11px;
          cursor: pointer;
          border: none;
          border-bottom: 1px solid transparent;
          margin-bottom: -0.5px;
          margin-right: 22px;
          background: none;
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
          transition: all 0.2s;
        }

        .dp-tab.on {
          color: var(--accent);
          border-bottom-color: var(--accent);
        }

        .dp-right-inner {
          width: 100%;
          max-width: 400px;
          padding: 0 32px;
        }

        /* ── Responsive ── */
        @media (min-width: 768px) {
          .dp-left { display: flex; }
          .dp-right { width: 45%; flex: none; }
          .dp-mobile-logo { display: none; }
          .dp-right-inner { padding: 0 44px; }
        }

        @media (max-width: 767px) {
          .dp-auth-root { flex-direction: column; }
          .dp-right { padding: 48px 0; }
        }
      `}</style>

      <div className="dp-auth-root" data-theme={dark ? 'dark' : 'light'}>

        <button className="dp-theme-btn" onClick={() => setDark(d => !d)} aria-label="Toggle theme">
          {dark ? '🌙' : '☀️'}
        </button>

        {/* LEFT — desktop only */}
        <div className="dp-left">
          <div className="dp-left-logo">DUMPPOST</div>
          <h1 className="dp-left-headline">
            Dump your thoughts.<br />
            <em>Post your story.</em>
          </h1>
          <p className="dp-left-tagline">Your raw ideas → your voice → LinkedIn, effortlessly.</p>
          <DemoAnimation />
        </div>

        {/* RIGHT */}
        <div className="dp-right">
          <div className="glow" />
          <div className="dp-right-inner">

            <div className="dp-mobile-logo">DUMPPOST</div>

            <div className="dp-tabs">
              <button className={`dp-tab${mode === 'signup' ? ' on' : ''}`} onClick={() => switchMode('signup')}>
                SIGN UP
              </button>
              <button className={`dp-tab${mode === 'signin' ? ' on' : ''}`} onClick={() => switchMode('signin')}>
                SIGN IN
              </button>
            </div>

            <p className="wordmark" style={{ marginBottom: '12px' }}>DumpPost</p>
            <h1 className="headline" style={{ marginBottom: '8px', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)' }}>
              {mode === 'signup' ? 'Create your account.' : 'Welcome back.'}
            </h1>
            <p className="tagline" style={{ marginBottom: '36px' }}>
              {mode === 'signup' ? 'Free during beta. No card required.' : 'Sign in to your account.'}
            </p>

            <div className="auth-form">
              <input
                className="auth-input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoComplete="email"
                autoFocus
                style={{ backgroundColor: 'transparent' }}
              />
              <div className="auth-password-wrap">
                <input
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  style={{ backgroundColor: 'transparent' }}
                />
                <button className="auth-eye-btn" onClick={() => setShowPassword(v => !v)} tabIndex={-1} aria-label="Toggle password">
                  <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`} />
                </button>
              </div>

              {mode === 'signin' && (
                <p style={{ textAlign: 'right', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>Forgot password?</span>
                </p>
              )}

              {error && <p className="auth-error">{error}</p>}

              <button className="cta-btn" onClick={handleSubmit} disabled={!email || !password || loading} style={{ width: '100%' }}>
                {loading
                  ? (mode === 'signup' ? 'Creating account...' : 'Signing in...')
                  : (mode === 'signup' ? 'Get started →' : 'Sign in →')}
              </button>

              <p className="auth-switch">
                {mode === 'signup' ? (
                  <>Already have an account?{' '}<span className="auth-link" onClick={() => switchMode('signin')}>Sign in</span></>
                ) : (
                  <>Don&apos;t have an account?{' '}<span className="auth-link" onClick={() => switchMode('signup')}>Sign up</span></>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}