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
  const [feedback, setFeedback] = useState<'accepted' | 'rejected' | null>(null);

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

  const handleGenerate = async () => {
    if (input.trim().length === 0) return;
    setLoading(true);
    setOutput('');
    setFeedback(null);

    // Fake response for now — real Groq API comes later
    await new Promise(r => setTimeout(r, 2000));
    setOutput(`Here's your LinkedIn post based on what you shared:\n\nI've been thinking a lot about this lately — and I think it's worth sharing.\n\n${input.trim().slice(0, 120)}...\n\nThe truth is, most people don't talk about this enough. But the ones who do? They're the ones moving forward.\n\nWhat's your take on this?\n\n#LinkedIn #Growth #Authenticity`);
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReject = () => {
    setFeedback('rejected');
    setOutput('');
    setInput('');
  };

  return (
    <main data-theme={dark ? 'dark' : 'light'} className="dump-page">
      <header className="dump-header">
        <p className="wordmark">DumpPost</p>
        <div className="dump-header-right">
          <span className="dump-greeting">{name ? `Hi, ${name}` : ''}</span>
          <button className="theme-toggle" style={{ position: 'static', opacity: 0.5 }} onClick={() => setDark(!dark)}>
            {dark ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <div className="dump-workspace">

        <div className="dump-panel">
          <label className="dump-label">Your thoughts</label>
          <textarea
            className="dump-input"
            placeholder="Just dump it all here. Raw thoughts, bullet points, a voice note transcript — anything. Don't overthink it."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="dump-actions">
            <span className="dump-char">{input.length} characters</span>
            <button
              className="cta-btn"
              onClick={handleGenerate}
              disabled={input.trim().length === 0 || loading}
            >
              {loading ? 'Writing your post...' : 'Generate post →'}
            </button>
          </div>
        </div>

        {(output || loading) && (
          <div className="dump-panel output-panel">
            <label className="dump-label">Your LinkedIn post</label>

            {loading ? (
              <div className="dump-loading">
                <span className="dump-loading-dot" />
                <span className="dump-loading-dot" />
                <span className="dump-loading-dot" />
              </div>
            ) : (
              <>
                <div className="dump-output">{output}</div>
                <div className="dump-feedback">
                  <button className="feedback-btn accept" onClick={() => setFeedback('accepted')}>
                    ✓ Looks good
                  </button>
                  <button className="feedback-btn copy" onClick={handleCopy}>
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                  <button className="feedback-btn reject" onClick={handleReject}>
                    ↺ Try again
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </main>
  );
}