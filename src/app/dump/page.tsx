'use client';

import { useState, useEffect } from 'react';

export default function Dump() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('dp-theme') || 'dark';
    setDark(saved === 'dark');
    document.documentElement.setAttribute('data-theme', saved);
    setName(localStorage.getItem('dp-name') || '');
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const theme = dark ? 'dark' : 'light';
    localStorage.setItem('dp-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [dark, mounted]);

  if (!mounted) return null;

  const wordCount = input.trim() === '' ? 0 : input.trim().split(/\s+/).length;

  const handleGenerate = async () => {
    if (input.trim().length === 0) return;
    setLoading(true);
    setOutput('');

    await new Promise(r => setTimeout(r, 2000));
    setOutput(`I've been thinking a lot about this lately — and I think it's worth sharing.\n\n${input.trim().slice(0, 180)}...\n\nThe truth is, most people don't talk about this enough. But the ones who do? They're the ones moving forward.\n\nWhat's your take on this?\n\n#LinkedIn #Growth #Authenticity`);
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main data-theme={dark ? 'dark' : 'light'} className="dump-page">

      <header className="dump-header">
        <p className="wordmark">DumpPost</p>
        <div className="dump-header-right">
          {name && <span className="dump-greeting">Hi, {name}</span>}
          <button
            className="theme-toggle"
            style={{ position: 'static', opacity: 0.4 }}
            onClick={() => setDark(!dark)}
          >
            {dark ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <div className="dump-workspace">

        {/* Left — Input */}
        <div className="dump-panel dump-panel-left">
          <div className="dump-panel-header">
            <span className="dump-label">Dump</span>
            <span className="dump-meta">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
          </div>

          <textarea
            className="dump-input"
            placeholder={`What's on your mind, ${name || 'there'}? Raw thoughts, bullet points, a voice note transcript — anything goes. Don't overthink it.`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <div className="dump-panel-footer">
            <p className="dump-hint-text">The messier the better. We'll clean it up.</p>
            <button
              className="cta-btn"
              onClick={handleGenerate}
              disabled={input.trim().length === 0 || loading}
            >
              {loading ? 'Writing...' : 'Generate →'}
            </button>
          </div>
        </div>

        {/* Right — Output */}
        <div className="dump-panel dump-panel-right">
          <div className="dump-panel-header">
            <span className="dump-label">Your post</span>
            {output && (
              <div className="dump-feedback">
                <button className="feedback-btn" onClick={handleCopy}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                <button className="feedback-btn reject" onClick={() => { setOutput(''); setInput(''); }}>
                  ↺ Retry
                </button>
              </div>
            )}
          </div>

          {!output && !loading && (
            <div className="dump-empty">
                <p className="dump-empty-text">
                {name ? `Ready when you are, ${name}.` : 'Ready when you are.'}<br />
                <span style={{ fontSize: '0.85rem', opacity: 0.5 }}>
                    Dump your thoughts on the left — we'll turn them into a post worth sharing.
                </span>
                </p>
            </div>
            )}

          {loading && (
            <div className="dump-loading-wrap">
              <div className="loading-dots">
                <span className="dump-loading-dot" />
                <span className="dump-loading-dot" />
                <span className="dump-loading-dot" />
              </div>
              <p className="dump-loading-label">Writing your post...</p>
            </div>
          )}

          {output && !loading && (
            <div className="dump-output-wrap">
              <div className="dump-output">{output}</div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}