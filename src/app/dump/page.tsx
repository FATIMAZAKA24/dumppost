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
    const post = `I've been thinking a lot about this lately — and I think it's worth sharing.\n\n${input.trim().slice(0, 180)}...\n\nThe truth is, most people don't talk about this enough. But the ones who do? They're the ones moving forward.\n\nWhat's your take on this?\n\n#LinkedIn #Growth #Authenticity`;
    setOutput(post);
    const history = JSON.parse(localStorage.getItem('dp-history') || '[]');
    history.push({ post, dump: input.trim(), date: new Date().toISOString() });
    localStorage.setItem('dp-history', JSON.stringify(history));
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
  <div className="section-page">
    <div className="section-header">
      <h2 className="section-title">History</h2>
      <p className="section-subtitle">Your past generated posts.</p>
    </div>

    {(() => {
      const history = JSON.parse(localStorage.getItem('dp-history') || '[]');
      if (history.length === 0) return (
        <div className="history-empty">
          <i className="ti ti-writing" style={{ fontSize: '2rem', color: 'var(--text-dim)', marginBottom: '12px' }} />
          <p className="section-subtitle">No posts yet. Generate your first one from the workspace.</p>
        </div>
      );
      return (
        <div className="history-list">
          {history.reverse().map((item: { post: string; date: string; dump: string }, i: number) => (
            <div key={i} className="history-item">
              <div className="history-item-header">
                <span className="history-date">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <button className="settings-action-btn" onClick={() => {
                  navigator.clipboard.writeText(item.post);
                }}>Copy</button>
              </div>
              <p className="history-post">{item.post}</p>
              <p className="history-dump-label">Original dump</p>
              <p className="history-dump">{item.dump}</p>
            </div>
          ))}
        </div>
      );
    })()}
  </div>
)}

        {/* Profile */}
{section === 'profile' && (
  <div className="section-page">
    <div className="section-header">
      <h2 className="section-title">Profile</h2>
      <p className="section-subtitle">How DumpPost knows you.</p>
    </div>

    <div className="profile-grid">
      <div className="profile-card">
        <span className="profile-card-label">Name</span>
        <span className="profile-card-value">{localStorage.getItem('dp-name') || '—'}</span>
      </div>

      <div className="profile-card">
        <span className="profile-card-label">Type</span>
        <span className="profile-card-value" style={{ textTransform: 'capitalize' }}>
          {localStorage.getItem('dp-type') === 'employed' ? 'Working Professional' : localStorage.getItem('dp-type') === 'student' ? 'Student' : '—'}
        </span>
      </div>
    </div>

    <div className="section-divider" />

    <div className="section-subheader">
      <h3 className="section-subtitle" style={{ color: 'var(--text)', marginBottom: '4px' }}>Your onboarding answers</h3>
      <p className="section-subtitle">These shape how your posts sound like you.</p>
    </div>

    <div className="answers-list">
      {(() => {
        const answers = JSON.parse(localStorage.getItem('dp-answers') || '[]');
        const type = localStorage.getItem('dp-type');
        const employedQuestions = [
          "What are you working on right now?",
          "What's the most interesting part of it?",
          "What's been giving you the most trouble with it?",
          "Who do you want reading your posts — and what do you want them to think when they do?",
          "What part of your work do you actually enjoy?",
          "Anything specific you want DumpPost to keep in mind?",
        ];
        const studentQuestions = [
          "What are you currently studying or learning?",
          "What's the most interesting thing you've come across recently?",
          "What's something you've been trying to figure out or struggling with?",
          "Who do you want reading your posts — and what do you want them to think when they do?",
          "What part of your field do you actually enjoy?",
          "Anything specific you want DumpPost to keep in mind?",
        ];
        const questions = type === 'student' ? studentQuestions : employedQuestions;
        if (answers.length === 0) return <p className="section-subtitle">No answers yet — complete onboarding first.</p>;
        return answers.map((answer: string, i: number) => (
          <div key={i} className="answer-item">
            <span className="answer-q">{questions[i]}</span>
            <span className="answer-a">{answer}</span>
          </div>
              ));
            })()}
          </div>
        </div>
      )}

 {/* Settings */}
{section === 'settings' && (
  <div className="section-page">
    <div className="section-header">
      <h2 className="section-title">Settings</h2>
      <p className="section-subtitle">Manage your preferences.</p>
    </div>

    <div className="settings-group">
      <p className="settings-group-label">Appearance</p>
      <div className="settings-row">
        <div className="settings-row-info">
          <span className="settings-row-title">Theme</span>
          <span className="settings-row-desc">Switch between dark and light mode</span>
        </div>
        <button className="settings-toggle-btn" onClick={() => setDark(!dark)}>
          {dark ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
    </div>

    <div className="section-divider" />

    <div className="settings-group">
      <p className="settings-group-label">Account</p>
      <div className="settings-row">
        <div className="settings-row-info">
          <span className="settings-row-title">Email</span>
          <span className="settings-row-desc">Your account email address</span>
        </div>
        <span className="settings-row-value">{localStorage.getItem('dp-name') || '—'}</span>
      </div>

      <div className="settings-row">
        <div className="settings-row-info">
          <span className="settings-row-title">Redo onboarding</span>
          <span className="settings-row-desc">Reset your profile and answer questions again</span>
        </div>
        <button className="settings-action-btn" onClick={() => {
          localStorage.removeItem('dp-answers');
          localStorage.removeItem('dp-type');
          localStorage.removeItem('dp-name');
          router.push('/onboarding');
        }}>
          Reset
        </button>
      </div>

      <div className="settings-row">
        <div className="settings-row-info">
          <span className="settings-row-title">Log out</span>
          <span className="settings-row-desc">Sign out of your account</span>
        </div>
        <button className="settings-action-btn danger" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>

    <div className="section-divider" />

    <div className="settings-group">
      <p className="settings-group-label">Legal</p>
      <div className="settings-row">
        <div className="settings-row-info">
          <span className="settings-row-title">Privacy policy</span>
        </div>
        <button className="settings-action-btn" onClick={() => window.open('https://dumppost.io/privacy', '_blank')}>View →</button>
      </div>
      <div className="settings-row">
        <div className="settings-row-info">
          <span className="settings-row-title">Usage policy</span>
        </div>
        <button className="settings-action-btn" onClick={() => window.open('https://dumppost.io/usage', '_blank')}>View →</button>
      </div>
    </div>
  </div>
)}

      </div>
    </main>
  );
}