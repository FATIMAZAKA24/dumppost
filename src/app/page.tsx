'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

export default function Home() {
  const [dark, setDark] = useState(true);
  const router = useRouter();

  const demo = useInView();
  const how = useInView();
  const cta = useInView();

  useEffect(() => {
    const saved = localStorage.getItem('dp-theme') || 'dark';
    setDark(saved === 'dark');
    document.documentElement.setAttribute('data-theme', saved);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dump');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) router.push('/dump');
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const theme = dark ? 'dark' : 'light';
    localStorage.setItem('dp-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [dark]);

  return (
    <>
      <style>{`
        .lp-root {
          min-height: 100dvh;
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
        }

        .lp-theme-btn {
          position: fixed;
          top: 16px;
          right: 20px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          z-index: 100;
          opacity: 0.4;
          transition: opacity 0.2s;
        }
        .lp-theme-btn:hover { opacity: 1; }

        /* ── HERO ── */
        .lp-hero {
          padding: 120px 24px 96px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border-bottom: 0.5px solid var(--border);
          animation: lp-rise 1.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes lp-rise {
        from { opacity: 0; transform: translateY(40px); }
        to   { opacity: 1; transform: translateY(0); }
        }

        .lp-wordmark {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          letter-spacing: 5px;
          color: var(--text-dim);
          text-transform: uppercase;
          margin-bottom: 24px;
          font-weight: 300;
        }

        .lp-headline {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.8rem, 6vw, 4rem);
          line-height: 1.12;
          font-weight: 300;
          color: var(--text);
          margin-bottom: 20px;
          max-width: 580px;
        }

        .lp-accent {
          color: var(--accent);
          font-style: italic;
        }

        .lp-tagline {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: var(--text-muted);
          max-width: 380px;
          line-height: 1.8;
          margin-bottom: 48px;
          font-weight: 300;
        }

        .lp-cta-btn {
          background: var(--accent);
          color: var(--accent-text);
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 2.5px;
          padding: 14px 32px;
          border-radius: 6px;
          cursor: pointer;
          text-transform: uppercase;
          transition: background 0.2s, transform 0.1s;
          margin-bottom: 16px;
        }
        .lp-cta-btn:hover { background: var(--accent-hover); }
        .lp-cta-btn:active { transform: scale(0.99); }

        .lp-beta-note {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          color: var(--text-dim);
          letter-spacing: 0.3px;
          font-weight: 300;
        }

        /* ── SCROLL REVEAL ── */
        .lp-reveal {
        opacity: 0;
        transform: translateY(60px);
        transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
        .lp-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── DEMO ── */
        .lp-demo {
          padding: 88px 24px;
          border-bottom: 0.5px solid var(--border);
        }

        .lp-section-label {
          text-align: center;
          font-family: 'DM Sans', sans-serif;
          font-size: 9px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 12px;
          font-weight: 300;
        }

        .lp-section-title {
          font-family: 'Cormorant Garamond', serif;
          text-align: center;
          font-size: clamp(1.5rem, 3vw, 1.85rem);
          color: var(--text);
          font-weight: 300;
          margin-bottom: 52px;
          line-height: 1.3;
        }

        .lp-demo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          max-width: 700px;
          margin: 0 auto;
        }

        .lp-demo-card {
          background: var(--surface);
          border: 0.5px solid var(--border);
          border-radius: 10px;
          padding: 24px;
          transition: border-color 0.3s;

          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
          transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .lp-reveal.visible .lp-demo-card:nth-child(1) { opacity:1; transform:translateY(0); transition-delay:0.15s; }
        .lp-reveal.visible .lp-demo-card:nth-child(2) { opacity:1; transform:translateY(0); transition-delay:0.3s; }
        .lp-demo-card:hover { border-color: var(--accent); }

        .lp-card-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 8px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 16px;
          font-weight: 300;
        }
        .lp-card-label.green { color: var(--accent); }

        .lp-dump-text {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.8;
          color: var(--text-muted);
        }

        .lp-post-text {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          line-height: 1.8;
          color: var(--text);
          font-weight: 300;
        }

        /* ── HOW IT WORKS ── */
        .lp-how {
          padding: 88px 24px;
          border-bottom: 0.5px solid var(--border);
        }

        .lp-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          max-width: 700px;
          margin: 0 auto;
        }

        .lp-step {
        opacity: 0;
        transform: translateY(40px);
        transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
      }
        .lp-reveal.visible .lp-step:nth-child(1) { opacity:1; transform:translateY(0); transition-delay:0.1s; }
        .lp-reveal.visible .lp-step:nth-child(2) { opacity:1; transform:translateY(0); transition-delay:0.25s; }
        .lp-reveal.visible .lp-step:nth-child(3) { opacity:1; transform:translateY(0); transition-delay:0.4s; }

        .lp-step-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--surface);
          border: 0.5px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px;
          color: var(--accent);
          font-size: 18px;
          transition: border-color 0.3s, background 0.3s;
        }
        .lp-step:hover .lp-step-icon {
          border-color: var(--accent);
          background: #141f0d;
        }

        .lp-step-title {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: var(--text);
          margin-bottom: 8px;
        }

        .lp-step-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.7;
          font-weight: 300;
        }

        /* ── BOTTOM CTA ── */
        .lp-bottom-cta {
          padding: 88px 24px 110px;
          text-align: center;
        }

        .lp-bottom-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.5rem, 3vw, 1.75rem);
          color: var(--text);
          font-weight: 300;
          margin-bottom: 36px;
          line-height: 1.3;
        }

        /* ── Responsive ── */
        @media (max-width: 620px) {
          .lp-hero { padding: 80px 20px 68px; }
          .lp-demo, .lp-how, .lp-bottom-cta { padding: 60px 20px; }
          .lp-demo-grid { grid-template-columns: 1fr; }
          .lp-steps { grid-template-columns: 1fr; gap: 36px; }
        }
      `}</style>

      <div className="lp-root" data-theme={dark ? 'dark' : 'light'}>

        <button className="lp-theme-btn" onClick={() => setDark(d => !d)} aria-label="Toggle theme">
          {dark ? '🌙' : '☀️'}
        </button>

        {/* ── HERO ── */}
        <div className="lp-hero">
          <div className="lp-wordmark">Dumppost</div>
          <h1 className="lp-headline">
            Your ideas, your <span className="lp-accent">voice.</span>
          </h1>
          <p className="lp-tagline">
            Type it or say it. Get a LinkedIn post that still sounds like you.
          </p>
          <button className="lp-cta-btn" onClick={() => router.push('/signup')}>
            Get started →
          </button>
          <span className="lp-beta-note">Free during beta · No card required</span>
        </div>

        {/* ── DEMO ── */}
        <div ref={demo.ref} className={`lp-reveal lp-demo${demo.inView ? ' visible' : ''}`}>
          <div className="lp-section-label">See it work</div>
          <h2 className="lp-section-title">Real input. Real output. Still your voice.</h2>
          <div className="lp-demo-grid">
            <div className="lp-demo-card">
              <div className="lp-card-label">You said</div>
              <div className="lp-dump-text">
                &ldquo;ugh just shipped a feature after 3 weeks of debugging, turned out to be a 4 line fix, patience &gt; speed i guess&rdquo;
              </div>
            </div>
            <div className="lp-demo-card">
              <div className="lp-card-label green">Dumppost wrote</div>
              <div className="lp-post-text">
                Three weeks. That&apos;s how long a bug had me questioning everything.<br /><br />
                Today it finally clicked — the fix was four lines of code.<br /><br />
                Some problems don&apos;t reward speed. They reward sticking around long enough to see them.
              </div>
            </div>
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div ref={how.ref} className={`lp-reveal lp-how${how.inView ? ' visible' : ''}`}>
          <div className="lp-section-label">How it works</div>
          <h2 className="lp-section-title">Three steps. No editing required.</h2>
          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-icon"><i className="ti ti-microphone" aria-hidden="true" /></div>
              <div className="lp-step-title">Speak or type</div>
              <div className="lp-step-desc">Say it out loud or jot it down, however it comes to you.</div>
            </div>
            <div className="lp-step">
              <div className="lp-step-icon"><i className="ti ti-sparkles" aria-hidden="true" /></div>
              <div className="lp-step-title">Shaped in your voice</div>
              <div className="lp-step-desc">Dumppost cleans it up, keeps your tone, cuts the corporate-speak.</div>
            </div>
            <div className="lp-step">
              <div className="lp-step-icon"><i className="ti ti-send" aria-hidden="true" /></div>
              <div className="lp-step-title">Publish</div>
              <div className="lp-step-desc">Copy it straight to LinkedIn. No rewriting needed.</div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM CTA ── */}
        <div ref={cta.ref} className={`lp-reveal lp-bottom-cta${cta.inView ? ' visible' : ''}`}>
          <div className="lp-bottom-title">Try it on your next thought.</div>
          <button className="lp-cta-btn" onClick={() => router.push('/signup')}>
            Get started →
          </button>
          <div className="lp-beta-note" style={{ marginTop: '14px' }}>
            Free during beta · No card required
          </div>
        </div>

      </div>
    </>
  );
}