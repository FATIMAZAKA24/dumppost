'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Section = 'workspace' | 'history' | 'profile' | 'settings';

export default function Dump() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [section, setSection] = useState<Section>('workspace');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    router.push('/');
  };

  const handleNewPost = () => {
    setInput('');
    setOutput('');
    setSection('workspace');
  };

  return (
    <main data-theme={dark ? 'dark' : 'light'} className="app-layout">

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-logo">
            {!sidebarCollapsed && <span className="wordmark" style={{ marginBottom: 0, fontSize: '0.75rem' }}>DumpPost</span>}
            <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              <i className={`ti ${sidebarCollapsed ? 'ti-layout-sidebar' : 'ti-layout-sidebar'}`} />
            </button>
          </div>

          <button className="new-post-btn" onClick={handleNewPost}>
            <i className="ti ti-pencil-plus" />
            {!sidebarCollapsed && <span>New post</span>}
          </button>

          <nav className="sidebar-nav">
            <button className={`nav-item ${section === 'workspace' ? 'active' : ''}`} onClick={() => setSection('workspace')}>
              <i className="ti ti-writing" />
              {!sidebarCollapsed && <span>Workspace</span>}
            </button>
            <button className={`nav-item ${section === 'history' ? 'active' : ''}`} onClick={() => setSection('history')}>
              <i className="ti ti-history" />
              {!sidebarCollapsed && <span>History</span>}
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button className="nav-item upgrade-btn" onClick={() => setSection('settings')}>
            <i className="ti ti-star" />
            {!sidebarCollapsed && <span>Upgrade</span>}
          </button>
          <button className="nav-item" onClick={() => setSection('profile')}>
            <i className="ti ti-user" />
            {!sidebarCollapsed && <span>Profile</span>}
          </button>
          <button className="nav-item" onClick={() => setSection('settings')}>
            <i className="ti ti-settings" />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>
          <button className="nav-item" onClick={() => window.open('https://dumppost.io/tutorials', '_blank')}>
            <i className="ti ti-book" />
            {!sidebarCollapsed && <span>Tutorials</span>}
          </button>
          <button className="nav-item" onClick={() => window.open('https://dumppost.io/privacy', '_blank')}>
            <i className="ti ti-shield" />
            {!sidebarCollapsed && <span>Privacy policy</span>}
          </button>
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <i className="ti ti-logout" />
            {!sidebarCollapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="app-main">

        {/* Workspace */}
        {section === 'workspace' && (
          <div className="dump-page" style={{ animation: 'none' }}>
            <header className="dump-header">
              <span className="dump-greeting" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {name ? `Hi, ${name}` : 'Workspace'}
              </span>
              <button className="theme-toggle" style={{ position: 'static', opacity: 0.4 }} onClick={() => setDark(!dark)}>
                {dark ? '🌙' : '☀️'}
              </button>
            </header>

            <div className="dump-workspace">
              <div className="dump-panel dump-panel-left">
                <div className="dump-panel-header">
                  <span className="dump-label">Dump</span>
                  <span className="dump-meta">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                </div>
                <textarea
                  className="dump-input"
                  placeholder={`What's on your mind, ${name || 'there'}? Raw thoughts, bullet points, anything goes.`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <div className="dump-panel-footer">
                  <p className="dump-hint-text">The messier the better. We'll clean it up.</p>
                  <button className="cta-btn" onClick={handleGenerate} disabled={input.trim().length === 0 || loading}>
                    {loading ? 'Writing...' : 'Generate →'}
                  </button>
                </div>
              </div>

              <div className="dump-panel dump-panel-right">
                <div className="dump-panel-header">
                  <span className="dump-label">Your post</span>
                  {output && (
                    <div className="dump-feedback">
                      <button className="feedback-btn" onClick={handleCopy}>{copied ? '✓ Copied' : 'Copy'}</button>
                      <button className="feedback-btn reject" onClick={() => { setOutput(''); setInput(''); }}>↺ Retry</button>
                    </div>
                  )}
                </div>
                {!output && !loading && (
                <div className="dump-empty">
                  <p className="dump-empty-text">
                    <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>Dump your thoughts on the left — we'll turn them into a post worth sharing.</span>
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
          </div>
        )}

        {/* History */}
        {section === 'history' && (
          <div className="section-placeholder">
            <i className="ti ti-history" style={{ fontSize: '2rem', color: 'var(--text-dim)', marginBottom: '16px' }} />
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: '1.8rem', color: 'var(--text)', marginBottom: '8px' }}>History</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Your past generated posts will appear here.</p>
          </div>
        )}

        {/* Profile */}
        {section === 'profile' && (
          <div className="section-placeholder">
            <i className="ti ti-user" style={{ fontSize: '2rem', color: 'var(--text-dim)', marginBottom: '16px' }} />
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: '1.8rem', color: 'var(--text)', marginBottom: '8px' }}>Profile</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Your name, user type and onboarding answers.</p>
          </div>
        )}

        {/* Settings */}
        {section === 'settings' && (
          <div className="section-placeholder">
            <i className="ti ti-settings" style={{ fontSize: '2rem', color: 'var(--text-dim)', marginBottom: '16px' }} />
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: '1.8rem', color: 'var(--text)', marginBottom: '8px' }}>Settings</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Theme</span>
              <button className="cta-btn" onClick={() => setDark(!dark)} style={{ padding: '8px 20px', fontSize: '0.75rem' }}>
                {dark ? '🌙 Dark' : '☀️ Light'}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}