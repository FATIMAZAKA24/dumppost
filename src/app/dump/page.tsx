'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Section = 'workspace' | 'history' | 'profile' | 'settings' | 'tutorials' | 'privacy' | 'usage' | 'pricing';

export default function Dump() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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

    const checkAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    router.push('/login');
  } else {
    if (session?.user?.email) setEmail(session.user.email);
    setName(localStorage.getItem('dp-name') || '');
  }
};
    checkAuth();
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
          {!sidebarCollapsed && (
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {name ? name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{name || 'User'}</span>
              <span className="sidebar-user-plan">Free plan</span>
            </div>
          </div>
        )}

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
  <button className="nav-item upgrade-btn" onClick={() => setSection('pricing')}>
    <i className="ti ti-star" />
    {!sidebarCollapsed && <span>Upgrade plan</span>}
  </button>
          <button className="nav-item" onClick={() => setSection('profile')}>
            <i className="ti ti-user" />
            {!sidebarCollapsed && <span>Profile</span>}
          </button>
          <button className="nav-item" onClick={() => setSection('settings')}>
            <i className="ti ti-settings" />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>
          <button className="nav-item" onClick={() => setSection('tutorials')}>
  <i className="ti ti-book" />
  {!sidebarCollapsed && <span>Tutorials</span>}
    </button>
    <button className="nav-item" onClick={() => setSection('privacy')}>
      <i className="ti ti-shield" />
      {!sidebarCollapsed && <span>Privacy policy</span>}
    </button>
    <button className="nav-item" onClick={() => setSection('usage')}>
      <i className="ti ti-file-text" />
      {!sidebarCollapsed && <span>Usage policy</span>}
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
  <div>
    <span className="dump-label">Dump your thoughts</span>
    <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', fontWeight: 300, marginTop: '2px' }}>Raw, unfiltered — exactly as they come to you</p>
  </div>
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
                  <div>
  <span className="dump-label">Your LinkedIn post</span>
  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', fontWeight: 300, marginTop: '2px' }}>Generated from your dump</p>
</div>
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
        <span className="settings-row-value">{email || '—'}</span>
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
        <button className="settings-action-btn" onClick={() => setSection('privacy')}>View →</button>
      </div>
      <div className="settings-row">
        <div className="settings-row-info">
          <span className="settings-row-title">Usage policy</span>
        </div>
        <button className="settings-action-btn" onClick={() => setSection('usage')}>View →</button>
      </div>
    </div>
  </div>
)}
{/* Tutorials */}
{section === 'tutorials' && (
  <div className="section-page">
    <div className="section-header">
      <h2 className="section-title">Tutorials</h2>
      <p className="section-subtitle">Learn how to get the most out of DumpPost.</p>
    </div>
    <div className="tutorial-list">
      <div className="tutorial-item">
        <div className="tutorial-icon"><i className="ti ti-writing" /></div>
        <div className="tutorial-content">
          <span className="tutorial-title">How to write a great dump</span>
          <span className="tutorial-desc">The messier the better. Brain dump everything — bullet points, half sentences, voice note transcripts. Don't edit yourself. The more raw material you give DumpPost, the better your post will sound like you.</span>
        </div>
      </div>
      <div className="tutorial-item">
        <div className="tutorial-icon"><i className="ti ti-user-check" /></div>
        <div className="tutorial-content">
          <span className="tutorial-title">Your voice profile</span>
          <span className="tutorial-desc">DumpPost learns from your onboarding answers. The more honest you were, the more your posts will sound like you. You can redo your onboarding anytime from Settings.</span>
        </div>
      </div>
      <div className="tutorial-item">
        <div className="tutorial-icon"><i className="ti ti-refresh" /></div>
        <div className="tutorial-content">
          <span className="tutorial-title">Using Retry effectively</span>
          <span className="tutorial-desc">If the generated post doesn't feel right, hit Retry and add more context to your dump. The more specific you are, the better the output.</span>
        </div>
      </div>
      <div className="tutorial-item">
        <div className="tutorial-icon"><i className="ti ti-history" /></div>
        <div className="tutorial-content">
          <span className="tutorial-title">Your history</span>
          <span className="tutorial-desc">Every post you generate is saved in History. You can copy any past post from there anytime.</span>
        </div>
      </div>
    </div>
  </div>
)}

{/* Privacy Policy */}
{section === 'privacy' && (
  <div className="section-page">
    <div className="section-header">
      <h2 className="section-title">Privacy Policy</h2>
      <p className="section-subtitle">Last updated: May 2026</p>
    </div>
    <div className="policy-content">
      <div className="policy-block">
        <h3 className="policy-heading">What we collect</h3>
        <p className="policy-text">We collect your email address, name, user type, and your answers to onboarding questions. We also store the posts you generate and your raw input dumps.</p>
      </div>
      <div className="policy-block">
        <h3 className="policy-heading">How we use it</h3>
        <p className="policy-text">Your data is used solely to generate LinkedIn posts that sound like you. We do not sell your data to third parties.</p>
      </div>
      <div className="policy-block">
        <h3 className="policy-heading">Data storage</h3>
        <p className="policy-text">Your account data is stored securely via Supabase. Your posts and onboarding answers are stored in your browser's local storage and on our servers.</p>
      </div>
      <div className="policy-block">
        <h3 className="policy-heading">Your rights</h3>
        <p className="policy-text">You can delete your account and all associated data at any time by contacting us at privacy@dumppost.io.</p>
      </div>
      <div className="policy-block">
        <h3 className="policy-heading">Contact</h3>
        <p className="policy-text">For any privacy related questions, reach us at dumppostquery@gmail.com.</p>
      </div>
    </div>
  </div>
)}

{/* Usage Policy */}
{section === 'usage' && (
  <div className="section-page">
    <div className="section-header">
      <h2 className="section-title">Usage Policy</h2>
      <p className="section-subtitle">Last updated: May 2026</p>
    </div>
    <div className="policy-content">
      <div className="policy-block">
        <h3 className="policy-heading">Acceptable use</h3>
        <p className="policy-text">DumpPost is designed to help you create authentic LinkedIn content from your own thoughts and experiences.</p>
      </div>
      <div className="policy-block">
        <h3 className="policy-heading">Prohibited use</h3>
        <p className="policy-text">You may not use DumpPost to generate misleading, harmful, or plagiarized content. Accounts found violating these terms will be suspended.</p>
      </div>
      <div className="policy-block">
        <h3 className="policy-heading">AI generated content</h3>
        <p className="policy-text">Posts generated by DumpPost are based on your input. You are responsible for reviewing content before publishing.</p>
      </div>
      <div className="policy-block">
        <h3 className="policy-heading">Beta terms</h3>
        <p className="policy-text">DumpPost is currently in beta. Features may change and we may occasionally migrate data during this period.</p>
      </div>
      <div className="policy-block">
        <h3 className="policy-heading">Contact</h3>
        <p className="policy-text">For usage related questions, reach us at dumppostquery@gmail.com.</p>
      </div>
    </div>
  </div>
)}


{/* Pricing */}
{section === 'pricing' && (
  <div className="section-page">
    <div className="section-header">
      <h2 className="section-title">Plans</h2>
      <p className="section-subtitle">You're in early access. Here's what's coming.</p>
    </div>

    <div className="pricing-grid">
      <div className="pricing-card pricing-card-free">
        <div className="pricing-card-top">
          <span className="pricing-plan-name">Beta</span>
          <span className="pricing-plan-price">Free</span>
          <span className="pricing-plan-desc">Full access while we're in beta. No card needed, no catch.</span>
        </div>
        <div className="pricing-features">
          <div className="pricing-feature">
            <i className="ti ti-check" />
            <span>Unlimited post generation</span>
          </div>
          <div className="pricing-feature">
            <i className="ti ti-check" />
            <span>Personal voice profiling</span>
          </div>
          <div className="pricing-feature">
            <i className="ti ti-check" />
            <span>Post history</span>
          </div>
          <div className="pricing-feature">
            <i className="ti ti-check" />
            <span>Early access to everything we ship</span>
          </div>
        </div>
        <div className="pricing-card-footer">
          <span className="pricing-current-badge">Your current plan</span>
        </div>
      </div>

      <div className="pricing-card pricing-card-pro">
        <div className="pricing-card-top">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="pricing-plan-name">Pro</span>
            <span className="pro-badge">Coming soon</span>
          </div>
          <span className="pricing-plan-price">Launching soon</span>
          <span className="pricing-plan-desc">For people serious about their LinkedIn presence. Everything in Beta, plus:</span>
        </div>
        <div className="pricing-features">
          <div className="pricing-feature">
            <i className="ti ti-check" />
            <span>Everything in Beta</span>
          </div>
          <div className="pricing-feature pro-locked" onClick={() => alert('This feature is coming with Pro.')}>
            <i className="ti ti-lock" />
            <span>Tone & style controls</span>
            <span className="pro-tag">Pro</span>
          </div>
          <div className="pricing-feature pro-locked" onClick={() => alert('This feature is coming with Pro.')}>
            <i className="ti ti-lock" />
            <span>Multiple voice profiles</span>
            <span className="pro-tag">Pro</span>
          </div>
          <div className="pricing-feature pro-locked" onClick={() => alert('This feature is coming with Pro.')}>
            <i className="ti ti-lock" />
            <span>Post scheduling</span>
            <span className="pro-tag">Pro</span>
          </div>
          <div className="pricing-feature pro-locked" onClick={() => alert('This feature is coming with Pro.')}>
            <i className="ti ti-lock" />
            <span>Priority support</span>
            <span className="pro-tag">Pro</span>
          </div>
        </div>
        <div className="pricing-card-footer">
          <button className="cta-btn" style={{ width: '100%' }} onClick={() => window.location.href = 'mailto:dumppostquery@gmail.com?subject=DumpPost Pro Interest'}>
            Get notified when Pro launches →
          </button>
        </div>
      </div>
    </div>

    <p style={{ marginTop: '32px', fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
      Beta users get locked-in early pricing when Pro launches.
    </p>
  </div>
)}

      </div>
    </main>
  );
}