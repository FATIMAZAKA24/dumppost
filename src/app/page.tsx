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
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

const DUMP_TEXT = `"ugh just shipped a feature after 3 weeks of debugging, turned out to be a 4 line fix, patience > speed i guess"`;
const POST_TEXT = `Three weeks. That's how long a bug had me questioning everything.

Today it finally clicked — the fix was four lines of code.

Some problems don't reward speed. They reward sticking around long enough to see them.`;

type DemoPhase = 'typing-dump' | 'generating' | 'typing-post' | 'done';

function DemoAnimation({ started }: { started: boolean }) {
  const [dumpDisplay, setDumpDisplay] = useState('');
  const [postDisplay, setPostDisplay] = useState('');
  const [phase, setPhase] = useState<DemoPhase>('typing-dump');
  const [genWidth, setGenWidth] = useState(0);
  const [actionsVisible, setActionsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!started || hasStarted.current) return;
    hasStarted.current = true;
    let cancelled = false;

    function reset() {
      if (cancelled) return;
      setDumpDisplay(''); setPostDisplay('');
      setPhase('typing-dump'); setActionsVisible(false); setGenWidth(0);
      typeD(0);
    }

    function typeD(idx: number) {
      if (cancelled) return;
      if (idx <= DUMP_TEXT.length) {
        setDumpDisplay(DUMP_TEXT.slice(0, idx));
        const delay = idx < 4 ? 140 : idx < 12 ? 80 : 38;
        timerRef.current = setTimeout(() => typeD(idx + 1), delay);
      } else {
        timerRef.current = setTimeout(startGen, 700);
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
          timerRef.current = setTimeout(typeP, 18);
        } else {
          setPhase('done');
          setActionsVisible(true);
          timerRef.current = setTimeout(reset, 5000);
        }
      }
      typeP();
    }

    timerRef.current = setTimeout(reset, 300);
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [started]);

  const isGenerating = phase === 'generating';
  const showPost2 = phase === 'typing-post' || phase === 'done';

  return (
    <div className="lp-demo-grid">
      <div className={`lp-demo-card${phase === 'typing-dump' ? ' lp-demo-card-active' : ''}`}>
        <div className="lp-card-label">You said</div>
        <div className="lp-dump-text" style={{ minHeight: '72px' }}>
          {dumpDisplay}
          {phase === 'typing-dump' && <span className="lp-cursor" />}
        </div>
        <div className={`lp-gen-row${isGenerating ? ' visible' : ''}`}>
          <span className="lp-gen-label">GENERATING</span>
          <div className="lp-gen-bar-wrap">
            <div className="lp-gen-bar" style={{
              width: `${genWidth}%`,
              transition: genWidth === 100 ? 'width 2.2s linear' : 'none',
            }} />
          </div>
        </div>
      </div>
      <div className="lp-demo-card" style={{ opacity: showPost2 ? 1 : 0.3, transition: 'opacity 0.6s ease, border-color 0.4s', borderColor: showPost2 ? 'rgba(200,240,160,0.25)' : undefined }}>
        <div className="lp-card-label green">Dumppost wrote</div>
        <div className="lp-post-text" style={{ whiteSpace: 'pre-line', minHeight: '120px' }}>
          {postDisplay}
          {phase === 'typing-post' && <span className="lp-cursor" />}
        </div>
        {actionsVisible && (
          <div className="lp-post-actions">
            <span className="lp-post-action lp-post-action-copy">COPY</span>
            <span className="lp-post-action">REFINE</span>
            <span className="lp-post-action">RETRY</span>
          </div>
        )}
      </div>
    </div>
  );
}

const TESTIMONIALS = [
  {
    quote: "I complete projects I'm proud of and just don't post about them. The challenge is communicating technical complexity without making it too technical or too simplified.",
    name: "A.",
    role: "AI/ML Engineer",
  },
  {
    quote: "I haven't posted more than half the projects I'm working on — even the ones that would bump up my profile. They just end up sitting in my notes.",
    name: "E.",
    role: "Software Engineer",
  },
  {
    quote: "It's not that I don't have anything to share. It's figuring out how to say it — too technical or too basic — and then it just ends up not getting posted at all.",
    name: "M.",
    role: "AI Engineer",
  },
  {
    quote: "Am I good enough to be seen by people who've been here for decades? Is my project too basic for LinkedIn? That fear is what stops me most of the time.",
    name: "M.",
    role: "Software Engineer",
  },
  {
    quote: "Sometimes the work feels too technical and I'm not sure it'll add value to others, so I just end up not posting at all.",
    name: "M.",
    role: "AI/ML Engineer",
  },
];

export default function Home() {
  const [dark, setDark] = useState(true);
  const router = useRouter();

  const demo = useInView();
  const how = useInView();
  const testimonials = useInView();
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
          position: fixed; top: 16px; right: 20px;
          background: none; border: none; cursor: pointer;
          font-size: 18px; z-index: 100; opacity: 0.4;
          transition: opacity 0.2s;
        }
        .lp-theme-btn:hover { opacity: 1; }

        /* ── HERO ── */
        .lp-hero {
          padding: 128px 24px 112px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          animation: lp-rise 1.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes lp-rise {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .lp-wordmark {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; letter-spacing: 5px;
          color: var(--text-dim); text-transform: uppercase;
          margin-bottom: 28px; font-weight: 300;
        }

        .lp-headline {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2.8rem, 6vw, 4rem);
          line-height: 1.12; font-weight: 300;
          color: var(--text); margin-bottom: 22px;
          max-width: 560px;
        }

        .lp-accent { color: var(--accent); font-style: italic; }

        .lp-tagline {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; color: var(--text-muted);
          max-width: 360px; line-height: 1.8;
          margin-bottom: 52px; font-weight: 300;
        }

        .lp-cta-btn {
          background: var(--accent); color: var(--accent-text);
          border: none; font-family: 'DM Sans', sans-serif;
          font-size: 11px; font-weight: 500;
          letter-spacing: 2.5px; padding: 14px 32px;
          border-radius: 6px; cursor: pointer;
          text-transform: uppercase;
          transition: background 0.2s, transform 0.1s;
          margin-bottom: 16px;
        }
        .lp-cta-btn:hover { background: var(--accent-hover); }
        .lp-cta-btn:active { transform: scale(0.99); }

        .lp-beta-note {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px; color: var(--text-dim);
          letter-spacing: 0.3px; font-weight: 300;
        }

        /* ── SECTION FADE DIVIDER — replaces hard borders ── */
        .lp-fade-divider {
          width: 100%;
          height: 1px;
          background: linear-gradient(
            to right,
            transparent 0%,
            var(--border) 20%,
            var(--border) 80%,
            transparent 100%
          );
          opacity: 0.5;
          margin: 0 auto;
          max-width: 600px;
        }

        /* ── SCROLL REVEAL ── */
        .lp-reveal {
          opacity: 0;
          transform: translateY(50px);
          transition: opacity 1.1s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 1.1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .lp-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── SECTION SHARED ── */
        .lp-section {
          padding: 96px 24px;
        }

        .lp-section-label {
          text-align: center;
          font-family: 'DM Sans', sans-serif;
          font-size: 9px; letter-spacing: 4px;
          text-transform: uppercase; color: var(--text-dim);
          margin-bottom: 12px; font-weight: 300;
        }

        .lp-section-title {
          font-family: 'Cormorant Garamond', serif;
          text-align: center;
          font-size: clamp(1.5rem, 3vw, 1.85rem);
          color: var(--text); font-weight: 300;
          margin-bottom: 56px; line-height: 1.3;
        }

        /* ── DEMO ── */
        .lp-demo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px; max-width: 700px; margin: 0 auto;
        }

        .lp-demo-card {
          background: var(--surface);
          border: 0.5px solid var(--border);
          border-radius: 10px; padding: 24px;
          opacity: 0; transform: translateY(20px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.3s;
        }
        .lp-reveal.visible .lp-demo-card:nth-child(1) { opacity:1; transform:translateY(0); transition-delay:0.15s; }
        .lp-reveal.visible .lp-demo-card:nth-child(2) { opacity:1; transform:translateY(0); transition-delay:0.3s; }
        .lp-demo-card:hover { border-color: var(--accent); }

        .lp-card-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 8px; letter-spacing: 2.5px;
          text-transform: uppercase; color: var(--text-dim);
          margin-bottom: 16px; font-weight: 300;
        }
        .lp-card-label.green { color: var(--accent); }

        .lp-dump-text {
          font-family: 'Courier New', monospace;
          font-size: 12px; line-height: 1.8;
          color: var(--text-muted);
        }

        .lp-post-text {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; line-height: 1.8;
          color: var(--text); font-weight: 300;
        }

        /* ── HOW IT WORKS ── */
        .lp-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px; max-width: 700px; margin: 0 auto;
        }

        .lp-step {
          opacity: 0; transform: translateY(40px);
          transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: center;
        }
        .lp-reveal.visible .lp-step:nth-child(1) { opacity:1; transform:translateY(0); transition-delay:0.1s; }
        .lp-reveal.visible .lp-step:nth-child(2) { opacity:1; transform:translateY(0); transition-delay:0.25s; }
        .lp-reveal.visible .lp-step:nth-child(3) { opacity:1; transform:translateY(0); transition-delay:0.4s; }

        .lp-step-icon {
          width: 48px; height: 48px; border-radius: 50%;
          background: var(--surface); border: 0.5px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 18px; color: var(--accent); font-size: 18px;
          transition: border-color 0.3s, background 0.3s;
        }
        .lp-step:hover .lp-step-icon {
          border-color: var(--accent);
          background: rgba(200,240,160,0.06);
        }

        .lp-step-title {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 400;
          color: var(--text); margin-bottom: 8px;
        }

        .lp-step-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; color: var(--text-muted);
          line-height: 1.7; font-weight: 300;
        }

        /* ── TESTIMONIALS ── */
        .lp-testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px; max-width: 860px; margin: 0 auto;
        }

        .lp-testimonial {
          background: var(--surface);
          border: 0.5px solid var(--border);
          border-radius: 10px; padding: 22px 20px;
          display: flex; flex-direction: column; gap: 16px;
          opacity: 0; transform: translateY(30px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.3s;
        }
        .lp-reveal.visible .lp-testimonial:nth-child(1) { opacity:1; transform:translateY(0); transition-delay:0.05s; }
        .lp-reveal.visible .lp-testimonial:nth-child(2) { opacity:1; transform:translateY(0); transition-delay:0.15s; }
        .lp-reveal.visible .lp-testimonial:nth-child(3) { opacity:1; transform:translateY(0); transition-delay:0.25s; }
        .lp-reveal.visible .lp-testimonial:nth-child(4) { opacity:1; transform:translateY(0); transition-delay:0.35s; }
        .lp-reveal.visible .lp-testimonial:nth-child(5) { opacity:1; transform:translateY(0); transition-delay:0.45s; }
        .lp-testimonial:hover { border-color: rgba(200,240,160,0.25); }

        .lp-testimonial-quote {
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px; font-weight: 300; font-style: italic;
          line-height: 1.7; color: var(--text);
          flex: 1;
        }

        .lp-testimonial-quote::before { content: "\u201C"; }
        .lp-testimonial-quote::after  { content: "\u201D"; }

        .lp-testimonial-meta {
          display: flex; align-items: center; gap: 10px;
        }

        .lp-testimonial-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: rgba(200,240,160,0.08);
          border: 0.5px solid rgba(200,240,160,0.2);
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px; font-weight: 500;
          color: var(--accent); flex-shrink: 0;
        }

        .lp-testimonial-info {
          display: flex; flex-direction: column; gap: 1px;
        }

        .lp-testimonial-name {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px; font-weight: 400;
          color: var(--text-muted);
        }

        .lp-testimonial-role {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; font-weight: 300;
          color: var(--text-dim); letter-spacing: 0.2px;
        }

        /* 5 cards: first row 3, second row 2 centered */
        .lp-testimonial:nth-child(4),
        .lp-testimonial:nth-child(5) {
          grid-column: span 1;
        }

        .lp-testimonials-row2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px; max-width: 574px;
          margin: 14px auto 0;
        }

        .lp-testimonials-row2 .lp-testimonial {
          opacity: 0; transform: translateY(30px);
        }
        .lp-reveal.visible .lp-testimonials-row2 .lp-testimonial:nth-child(1) { opacity:1; transform:translateY(0); transition-delay:0.35s; }
        .lp-reveal.visible .lp-testimonials-row2 .lp-testimonial:nth-child(2) { opacity:1; transform:translateY(0); transition-delay:0.45s; }

        /* ── BOTTOM CTA ── */
        .lp-bottom-cta {
          padding: 96px 24px 110px;
          text-align: center;
        }

        .lp-bottom-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.5rem, 3vw, 1.75rem);
          color: var(--text); font-weight: 300;
          margin-bottom: 36px; line-height: 1.3;
        }

        /* ── FOOTER ── */
        .lp-footer {
          padding: 24px 32px;
          display: flex; justify-content: space-between; align-items: center;
          border-top: 0.5px solid var(--border);
        }

        .lp-footer span, .lp-footer a {
          font-size: 11px; color: var(--text-dim);
          font-family: 'DM Sans', sans-serif;
          font-weight: 300; letter-spacing: 0.3px;
          text-decoration: none;
        }


        /* ── DEMO ANIMATION ── */
        .lp-cursor {
          display: inline-block;
          width: 1.5px; height: 13px;
          background: var(--accent);
          vertical-align: middle;
          margin-left: 1px;
          animation: lp-blink 1s step-end infinite;
        }
        @keyframes lp-blink { 0%,100% { opacity:1; } 50% { opacity:0; } }

        .lp-demo-card-active { border-color: rgba(200,240,160,0.3) !important; }

        .lp-gen-row {
          display: flex; align-items: center; gap: 10px;
          height: 14px; margin-top: 14px;
          opacity: 0; transition: opacity 0.3s;
        }
        .lp-gen-row.visible { opacity: 1; }

        .lp-gen-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 7.5px; letter-spacing: 1.5px;
          color: var(--text-dim); white-space: nowrap;
        }

        .lp-gen-bar-wrap {
          flex: 1; height: 1px;
          background: var(--border); overflow: hidden;
        }

        .lp-gen-bar { height: 100%; background: var(--accent); width: 0%; }

        .lp-post-actions {
          display: flex; gap: 6px; margin-top: 16px;
          animation: lp-fadein 0.4s ease forwards;
        }
        @keyframes lp-fadein { from { opacity:0; } to { opacity:1; } }

        .lp-post-action {
          font-family: 'DM Sans', sans-serif;
          font-size: 7.5px; letter-spacing: 1.5px;
          padding: 4px 10px;
          border: 0.5px solid var(--border);
          border-radius: 3px; color: var(--text-dim);
        }
        .lp-post-action-copy {
          border-color: rgba(200,240,160,0.3);
          color: var(--accent);
        }

        /* ── Responsive ── */
        @media (max-width: 720px) {
          .lp-hero { padding: 88px 20px 72px; }
          .lp-section { padding: 72px 20px; }
          .lp-demo-grid { grid-template-columns: 1fr; }
          .lp-steps { grid-template-columns: 1fr; gap: 36px; }
          .lp-testimonials-grid { grid-template-columns: 1fr; }
          .lp-testimonials-row2 { grid-template-columns: 1fr; max-width: 100%; }
          .lp-bottom-cta { padding: 72px 20px 90px; }
          .lp-footer { flex-direction: column; gap: 10px; text-align: center; }
        }

        @media (min-width: 721px) and (max-width: 980px) {
          .lp-testimonials-grid { grid-template-columns: repeat(2, 1fr); }
          .lp-testimonials-row2 { grid-template-columns: 1fr; max-width: 280px; }
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
        <div ref={demo.ref} className={`lp-reveal lp-section${demo.inView ? ' visible' : ''}`}>
          <div className="lp-section-label">See it work</div>
          <h2 className="lp-section-title">Real input. Real output. Still your voice.</h2>
          <DemoAnimation started={demo.inView} />
        </div>

        {/* ── HOW IT WORKS ── */}
        <div ref={how.ref} className={`lp-reveal lp-section${how.inView ? ' visible' : ''}`}>
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

        {/* ── TESTIMONIALS ── */}
        <div ref={testimonials.ref} className={`lp-reveal lp-section${testimonials.inView ? ' visible' : ''}`}>
          <div className="lp-section-label">From beta users</div>
          <h2 className="lp-section-title">You&apos;re not the only one who feels this.</h2>

          <div className="lp-testimonials-grid">
            {TESTIMONIALS.slice(0, 3).map((t, i) => (
              <div className="lp-testimonial" key={i}>
                <div className="lp-testimonial-quote">{t.quote}</div>
                <div className="lp-testimonial-meta">
                  <div className="lp-testimonial-avatar">{t.name}</div>
                  <div className="lp-testimonial-info">
                    <div className="lp-testimonial-name">Beta user</div>
                    <div className="lp-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lp-testimonials-row2">
            {TESTIMONIALS.slice(3).map((t, i) => (
              <div className="lp-testimonial" key={i}>
                <div className="lp-testimonial-quote">{t.quote}</div>
                <div className="lp-testimonial-meta">
                  <div className="lp-testimonial-avatar">{t.name}</div>
                  <div className="lp-testimonial-info">
                    <div className="lp-testimonial-name">Beta user</div>
                    <div className="lp-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
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

        <footer className="lp-footer">
          <span>© 2026 DumpPost</span>
          <a href="mailto:dumppostquery@gmail.com">dumppostquery@gmail.com</a>
        </footer>

      </div>
    </>
  );
}