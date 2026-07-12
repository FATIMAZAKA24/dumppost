'use client';
import { useVoiceInput } from '@/lib/useVoiceInput';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';


type Section = 'workspace' | 'history' | 'profile' | 'settings' | 'tutorials' | 'privacy' | 'usage' | 'pricing';

function RetryMicButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const { isRecording, transcribing, handleMicToggle } = useVoiceInput(onTranscript);
  return (
    <button className="mic-btn-inline" onClick={handleMicToggle} disabled={transcribing}>
      <i className={`ti ${transcribing ? 'ti-loader' : isRecording ? 'ti-microphone-off' : 'ti-microphone'}`} style={{ color: isRecording ? '#ff6b6b' : 'var(--text-dim)' }} />
    </button>
  );
}

export default function Dump() {
  const { isRecording, transcribing, handleMicToggle } = useVoiceInput((text) => {
    setInput(prev => prev ? prev + '\n' + text : text);
  });
  const [versionGroup, setVersionGroup] = useState<string | null>(null);
  const [previousOutput, setPreviousOutput] = useState('');
  const [lastRejectionReason, setLastRejectionReason] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [dbHistory, setDbHistory] = useState<Array<{
    id: string;
    generated_output: string;
    raw_input: string;
    created_at: string;
    user_response?: string;
    version_group?: string;
    rejection_reason?: string;
  }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showRetryPanel, setShowRetryPanel] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedOutput, setEditedOutput] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
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
  const [currentInteractionId, setCurrentInteractionId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        const storedUserId = localStorage.getItem('dp-user-id');
        if (storedUserId !== session.user.id) {
          localStorage.clear();
          localStorage.setItem('dp-user-id', session.user.id);
        }
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

  useEffect(() => {
    if (section === 'history') loadHistory();
    setDrawerOpen(false);
  }, [section]);

  if (!mounted) return null;

  const wordCount = input.trim() === '' ? 0 : input.trim().split(/\s+/).length;

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('interactions')
          .select('id, generated_output, raw_input, created_at, user_response, version_group, rejection_reason')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        setDbHistory(data || []);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
    setHistoryLoading(false);
  };

  // Now accepts an optional rejectionReason so the specific feedback
  // that triggered THIS regeneration reaches the API directly,
  // instead of relying only on the pooled last-5 rejections in Supabase.
  const handleGenerate = async (rejectionReason?: string) => {
    if (input.trim().length === 0) return;
    setLoading(true);
    setOutput('');
    setCurrentInteractionId(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dump: input.trim(),
          userId: session?.user?.id,
          previousOutput: previousOutput || null,
          lastRejectionReason: rejectionReason || null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setOutput('Something went wrong. Please try again.');
      } else {
        setOutput(data.post);
        if (session?.user) {
          const newVersionGroup = previousOutput ? versionGroup : crypto.randomUUID();
          setVersionGroup(newVersionGroup);
          const { data: interaction } = await supabase
            .from('interactions')
            .insert({ user_id: session.user.id, raw_input: input.trim(), generated_output: data.post, llm_reasoning: data.reasoning || null, version_group: newVersionGroup })
            .select().single();
          if (interaction) setCurrentInteractionId(interaction.id);
        }
      }
    } catch {
      setOutput('Something went wrong. Please try again.');
    }
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
    setCurrentInteractionId(null);
    setShowRetryPanel(false);
    setIsEditing(false);
    setSection('workspace');
  };

  // Shared handler for both desktop and mobile Regenerate buttons.
  // Builds the reason string, saves it to Supabase, AND passes it
  // directly into handleGenerate so this specific regeneration
  // gets the exact feedback, not just the pooled history.
  const handleRegenerate = async () => {
    const reason = [...selectedReasons, customReason.trim()].filter(Boolean).join('; ');
    if (currentInteractionId) {
      await supabase.from('interactions').update({ user_response: 'rejected', rejection_reason: reason }).eq('id', currentInteractionId);
    }
    setLastRejectionReason(reason);
    setShowRetryPanel(false);
    setSelectedReasons([]);
    setCustomReason('');
    setCurrentInteractionId(null);
    setPreviousOutput(output);
    setOutput('');
    handleGenerate(reason);
  };

  // State 2 condition
  const isState2 = !!(output && !loading && !showRetryPanel && !isEditing);

  return (
    <main data-theme={dark ? 'dark' : 'light'} className="app-layout">

      {/* ── Mobile full-screen drawer ── */}
      <div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-top">
          <span className="mobile-drawer-brand">DUMPPOST</span>
          <button className="mobile-drawer-close" onClick={() => setDrawerOpen(false)}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="mobile-drawer-nav">
          <button className="mobile-drawer-new-post" onClick={handleNewPost}>
            <i className="ti ti-pencil-plus" />
            New post
          </button>
          <button className={`mobile-drawer-nav-item ${section === 'workspace' ? 'active' : ''}`} onClick={() => setSection('workspace')}>
            <i className="ti ti-writing" />Workspace
          </button>
          <button className={`mobile-drawer-nav-item ${section === 'history' ? 'active' : ''}`} onClick={() => setSection('history')}>
            <i className="ti ti-history" />History
          </button>
        </div>
        <div className="mobile-drawer-bottom">
          <button className="mobile-drawer-bottom-item" onClick={() => setSection('pricing')}><i className="ti ti-star" />Upgrade plan</button>
          <button className="mobile-drawer-bottom-item" onClick={() => setSection('tutorials')}><i className="ti ti-book" />Tutorials</button>
          <button className="mobile-drawer-bottom-item" onClick={() => setSection('privacy')}><i className="ti ti-shield" />Privacy policy</button>
          <button className="mobile-drawer-bottom-item" onClick={() => setSection('usage')}><i className="ti ti-file-text" />Usage policy</button>
          <div className="mobile-drawer-profile" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="mobile-drawer-profile-left">
              <div className="sidebar-avatar">{name ? name.charAt(0).toUpperCase() : 'U'}</div>
              <div>
                <div className="mobile-drawer-profile-name">{name || 'User'}</div>
                <div className="mobile-drawer-profile-plan">Free plan</div>
              </div>
            </div>
            <i className={`ti ${showUserMenu ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }} />
          </div>
          {showUserMenu && (
            <div className="mobile-drawer-user-menu">
              <button className="user-menu-item" onClick={(e) => { e.stopPropagation(); setSection('profile'); setShowUserMenu(false); }}><i className="ti ti-user" /><span>Profile</span></button>
              <button className="user-menu-item" onClick={(e) => { e.stopPropagation(); setSection('settings'); setShowUserMenu(false); }}><i className="ti ti-settings" /><span>Settings</span></button>
              <button className="user-menu-item danger" onClick={(e) => { e.stopPropagation(); handleLogout(); }}><i className="ti ti-logout" /><span>Log out</span></button>
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-logo">
            {!sidebarCollapsed && <span className="wordmark" style={{ marginBottom: 0, fontSize: '0.75rem' }}>DumpPost</span>}
            <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              <i className="ti ti-layout-sidebar" />
            </button>
          </div>
          <button className="new-post-btn" onClick={handleNewPost}>
            <i className="ti ti-pencil-plus" />
            {!sidebarCollapsed && <span>New post</span>}
          </button>
          <nav className="sidebar-nav">
            <button data-tooltip="Workspace" className={`nav-item ${section === 'workspace' ? 'active' : ''}`} onClick={() => setSection('workspace')}>
              <i className="ti ti-writing" />{!sidebarCollapsed && <span>Workspace</span>}
            </button>
            <button data-tooltip="History" className={`nav-item ${section === 'history' ? 'active' : ''}`} onClick={() => setSection('history')}>
              <i className="ti ti-history" />{!sidebarCollapsed && <span>History</span>}
            </button>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <button data-tooltip="Upgrade plan" className="nav-item upgrade-btn" onClick={() => setSection('pricing')}>
            <i className="ti ti-star" />{!sidebarCollapsed && <span>Upgrade plan</span>}
          </button>
          <button data-tooltip="Tutorials" className="nav-item" onClick={() => setSection('tutorials')}>
            <i className="ti ti-book" />{!sidebarCollapsed && <span>Tutorials</span>}
          </button>
          <button data-tooltip="Privacy policy" className="nav-item" onClick={() => setSection('privacy')}>
            <i className="ti ti-shield" />{!sidebarCollapsed && <span>Privacy policy</span>}
          </button>
          <button data-tooltip="Usage policy" className="nav-item" onClick={() => setSection('usage')}>
            <i className="ti ti-file-text" />{!sidebarCollapsed && <span>Usage policy</span>}
          </button>
          <div className="sidebar-user" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="sidebar-avatar">{name ? name.charAt(0).toUpperCase() : 'U'}</div>
            {!sidebarCollapsed && (
              <>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{name || 'User'}</span>
                  <span className="sidebar-user-plan">Free plan</span>
                </div>
                <i className={`ti ${showUserMenu ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginLeft: 'auto' }} />
              </>
            )}
            {showUserMenu && (
              <div className="user-menu">
                <button className="user-menu-item" onClick={(e) => { e.stopPropagation(); setSection('profile'); setShowUserMenu(false); }}><i className="ti ti-user" /><span>Profile</span></button>
                <button className="user-menu-item" onClick={(e) => { e.stopPropagation(); setSection('settings'); setShowUserMenu(false); }}><i className="ti ti-settings" /><span>Settings</span></button>
                <button className="user-menu-item danger" onClick={(e) => { e.stopPropagation(); handleLogout(); }}><i className="ti ti-logout" /><span>Log out</span></button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="app-main">

        {/* Mobile topbar */}
        <div className="mobile-topbar">
          <button className="mobile-topbar-toggle" onClick={() => setDrawerOpen(true)}>
            <i className="ti ti-layout-sidebar" />
          </button>
          <div className="mobile-topbar-right">
            <span className="dump-greeting">
              {name ? `Hi, ${name}` : 'Workspace'}
            </span>
            <button className="theme-toggle" style={{ position: 'static', opacity: 0.4 }} onClick={() => setDark(!dark)}>
              {dark ? '🌙' : '☀️'}
            </button>
          </div>
        </div>

        {/* ── WORKSPACE ── */}
        {section === 'workspace' && (
          <>
            {/* Desktop workspace */}
            <div className="dump-page desktop-only" style={{ animation: 'none' }}>
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
                    placeholder={`What's on your mind, ${name || 'there'}?\n\nJust dump it — bullet points, half sentences, voice note transcripts, whatever's in your head. The messier the better. We'll clean it up.`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <div className="dump-panel-footer">
                    <button className={`mic-btn ${isRecording ? 'recording' : ''}`} onClick={handleMicToggle} disabled={loading || transcribing} title={isRecording ? 'Stop recording' : 'Start voice input'}>
                      <i className={`ti ${transcribing ? 'ti-loader' : isRecording ? 'ti-microphone-off' : 'ti-microphone'}`} />
                      {isRecording && <span className="mic-label">Recording...</span>}
                      {transcribing && <span className="mic-label">Transcribing...</span>}
                    </button>
                    <button className="cta-btn" onClick={() => handleGenerate()} disabled={input.trim().length === 0 || loading}>
                      {loading ? 'Writing...' : 'Generate →'}
                    </button>
                  </div>
                </div>
                <div className="dump-panel dump-panel-right">
                  <div className="dump-panel-header">
                    <span className="dump-label">Your post</span>
                    {output && !showRetryPanel && !isEditing && (
                      <div className="dump-feedback">
                        <button className="feedback-btn" onClick={async () => { handleCopy(); if (currentInteractionId) await supabase.from('interactions').update({ user_response: 'accepted' }).eq('id', currentInteractionId); }}>{copied ? '✓ Copied' : 'Copy'}</button>
                        <button className="feedback-btn" onClick={() => { setIsEditing(true); setEditedOutput(output); }}>✎ Refine</button>
                        <button className="feedback-btn reject" onClick={() => { setShowRetryPanel(true); setSelectedReason(''); setCustomReason(''); }}>↺ Retry</button>
                      </div>
                    )}
                    {isEditing && (
                      <div className="dump-feedback">
                        <button className="feedback-btn" onClick={async () => { navigator.clipboard.writeText(editedOutput); setOutput(editedOutput); setIsEditing(false); setCopied(true); setTimeout(() => setCopied(false), 2000); if (currentInteractionId) await supabase.from('interactions').update({ user_response: 'edited', edits_made: editedOutput }).eq('id', currentInteractionId); }}>✓ Copy edited</button>
                        <button className="feedback-btn" onClick={() => { setOutput(editedOutput); setIsEditing(false); }}>Save</button>
                        <button className="feedback-btn reject" onClick={() => { setIsEditing(false); setEditedOutput(''); }}>Cancel</button>
                      </div>
                    )}
                  </div>
                  {!output && !loading && (
                    <div className="dump-empty-ghost">
                      <div className="ghost-label">Your post will appear here</div>
                      <div className="ghost-line ghost-line-full" /><div className="ghost-line ghost-line-full" /><div className="ghost-line ghost-line-3q" />
                      <div className="ghost-spacer" />
                      <div className="ghost-line ghost-line-full" /><div className="ghost-line ghost-line-full" /><div className="ghost-line ghost-line-half" />
                      <div className="ghost-spacer" />
                      <div className="ghost-line ghost-line-full" /><div className="ghost-line ghost-line-3q" />
                      <div className="ghost-spacer" />
                      <div className="ghost-line ghost-line-quarter" /><div className="ghost-line ghost-line-quarter" /><div className="ghost-line ghost-line-quarter" />
                    </div>
                  )}
                  {loading && (
                    <div className="dump-loading-wrap">
                      <div className="loading-dots"><span className="dump-loading-dot" /><span className="dump-loading-dot" /><span className="dump-loading-dot" /></div>
                      <p className="dump-loading-label">Writing your post...</p>
                    </div>
                  )}
                  {output && !loading && !showRetryPanel && !isEditing && (
                    <div className="dump-output-wrap"><div className="dump-output">{output}</div></div>
                  )}
                  {output && !loading && isEditing && (
                    <textarea className="dump-input" value={editedOutput} onChange={(e) => setEditedOutput(e.target.value)} style={{ padding: '24px 32px', flex: 1 }} autoFocus />
                  )}
                  {showRetryPanel && (
                    <div className="retry-panel">
                      <p className="retry-label">What didn't work?</p>
                      <div className="retry-options">
                        {['Too AI-sounding', 'Wrong tone for my audience', 'Missed the point entirely', 'Length was off', 'Felt too generic'].map((reason) => (
                          <button key={reason} className={`retry-option ${selectedReasons.includes(reason) ? 'selected' : ''}`} onClick={() => setSelectedReasons(prev => prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason])}>
                            <span className="retry-dot" />{reason}
                          </button>
                        ))}
                        <div className="retry-custom-wrap">
                          <span className="retry-dot" />
                          <input className="retry-custom-input" placeholder="Something else? Describe it..." value={customReason} onChange={(e) => { setCustomReason(e.target.value); if (e.target.value) setSelectedReasons([]); }} />
                          <RetryMicButton onTranscript={(text) => { setCustomReason(text); setSelectedReasons([]); }} />
                        </div>
                      </div>
                      <div className="retry-footer">
                        <button className="feedback-btn" onClick={() => { setShowRetryPanel(false); setSelectedReason(''); setCustomReason(''); }}>Cancel</button>
                        <button className="cta-btn" disabled={selectedReasons.length === 0 && !customReason.trim()} onClick={handleRegenerate}>Regenerate →</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Mobile workspace — inlined, no sub-components ── */}
            <div className="mobile-workspace mobile-only">

              {/* State 1: writing / loading / retry / editing */}
              {!isState2 && (
                <>
                  <div className="mobile-dump-header">
                    <span className="dump-label">Dump</span>
                    <span className="dump-meta">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                  </div>

                  <div className="mobile-dumpbox-wrap">
                    {/* Normal textarea — always mounted, hidden when not needed */}
                    {!loading && !showRetryPanel && (
                      <textarea
                        className="mobile-dump-textarea"
                        placeholder={`What's on your mind, ${name || 'there'}?\n\nBullet points, half sentences, voice notes — anything.`}
                        value={isEditing ? editedOutput : input}
                        onChange={(e) => isEditing ? setEditedOutput(e.target.value) : setInput(e.target.value)}
                      />
                    )}

                    {/* Loading — centered */}
                    {loading && (
                      <div className="mobile-loading-center">
                        <div className="loading-dots">
                          <span className="dump-loading-dot" />
                          <span className="dump-loading-dot" />
                          <span className="dump-loading-dot" />
                        </div>
                        <p className="dump-loading-label">Writing your post...</p>
                      </div>
                    )}

                    {/* Retry panel */}
                    {showRetryPanel && (
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
                        <p className="retry-label">What didn't work?</p>
                        <div className="retry-options" style={{ flex: 1 }}>
                          {['Too AI-sounding', 'Wrong tone for my audience', 'Missed the point entirely', 'Length was off', 'Felt too generic'].map((reason) => (
                            <button key={reason} className={`retry-option ${selectedReasons.includes(reason) ? 'selected' : ''}`} onClick={() => setSelectedReasons(prev => prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason])}>
                              <span className="retry-dot" />{reason}
                            </button>
                          ))}
                          <div className="retry-custom-wrap">
                            <span className="retry-dot" />
                            <input className="retry-custom-input" placeholder="Something else? Describe it..." value={customReason} onChange={(e) => { setCustomReason(e.target.value); if (e.target.value) setSelectedReasons([]); }} />
                            <RetryMicButton onTranscript={(text) => { setCustomReason(text); setSelectedReasons([]); }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mic button — bottom-right of box, only in normal/edit mode */}
                    {!loading && !showRetryPanel && (
                      <button className={`mobile-mic-btn ${isRecording ? 'recording' : ''}`} onClick={handleMicToggle} disabled={transcribing}>
                        <i className={`ti ${transcribing ? 'ti-loader' : isRecording ? 'ti-microphone-off' : 'ti-microphone'}`} />
                      </button>
                    )}
                  </div>

                  {/* Generate / action button pinned at bottom */}
                  {showRetryPanel ? (
                    <div style={{ display: 'flex', gap: '8px', padding: '10px 16px 16px' }}>
                      <button className="feedback-btn" style={{ flex: 1 }} onClick={() => { setShowRetryPanel(false); setSelectedReason(''); setCustomReason(''); }}>Cancel</button>
                      <button className="mobile-generate-btn" style={{ flex: 2, margin: 0 }} disabled={selectedReasons.length === 0 && !customReason.trim()} onClick={handleRegenerate}>Regenerate →</button>
                    </div>
                  ) : isEditing ? (
                    <div style={{ display: 'flex', gap: '8px', padding: '10px 16px 16px' }}>
                      <button className="feedback-btn" style={{ flex: 1 }} onClick={() => { setIsEditing(false); setEditedOutput(''); }}>Cancel</button>
                      <button className="mobile-generate-btn" style={{ flex: 2, margin: 0 }} onClick={async () => {
                        navigator.clipboard.writeText(editedOutput);
                        setOutput(editedOutput);
                        setIsEditing(false);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                        if (currentInteractionId) await supabase.from('interactions').update({ user_response: 'edited', edits_made: editedOutput }).eq('id', currentInteractionId);
                      }}>Copy edited →</button>
                    </div>
                  ) : (
                    <button className="mobile-generate-btn" onClick={() => handleGenerate()} disabled={loading || input.trim().length === 0}>
                      {loading ? 'Writing...' : 'Generate →'}
                    </button>
                  )}
                </>
              )}

              {/* State 2: post generated */}
              {isState2 && (
                <>
                  <div className="mobile-dump-mini">
                    <div className="mobile-dump-mini-label">
                      <span>DUMP · {wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                      <button className="mobile-dump-mini-edit" onClick={() => setOutput('')}>EDIT</button>
                    </div>
                    <div className="mobile-dump-mini-text">{input.length > 80 ? input.slice(0, 80) + '…' : input}</div>
                  </div>

                  <div className="mobile-post-area">
                    <div className="mobile-post-header">
                      <span className="dump-label">Your post</span>
                      <div className="mobile-post-actions">
                        <button className="mobile-act-btn" onClick={async () => { handleCopy(); if (currentInteractionId) await supabase.from('interactions').update({ user_response: 'accepted' }).eq('id', currentInteractionId); }}>
                          <i className="ti ti-copy" />{copied ? 'Copied' : 'Copy'}
                        </button>
                        <button className="mobile-act-btn" onClick={() => { setIsEditing(true); setEditedOutput(output); setOutput(''); }}>
                          ✎ Refine
                        </button>
                        <button className="mobile-act-btn" onClick={() => { setShowRetryPanel(true); setSelectedReason(''); setCustomReason(''); setOutput(''); }}>
                          ↺ Retry
                        </button>
                      </div>
                    </div>
                    <div className="mobile-postbox">
                      <div className="mobile-post-text">{output}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── HISTORY ── */}
        {section === 'history' && (
          <div className="section-page">
            <div className="section-header">
              <h2 className="section-title">History</h2>
              <p className="section-subtitle">Your past generated posts.</p>
            </div>
            {historyLoading ? (
              <div className="history-empty"><div className="loading-dots"><span className="dump-loading-dot" /><span className="dump-loading-dot" /><span className="dump-loading-dot" /></div></div>
            ) : dbHistory.length === 0 ? (
              <div className="history-empty"><i className="ti ti-writing" style={{ fontSize: '2rem', color: 'var(--text-dim)', marginBottom: '12px' }} /><p className="section-subtitle">No posts yet. Generate your first one from the workspace.</p></div>
            ) : (
              <div className="history-list">
                {(() => {
                  const groups = dbHistory.reduce((acc: Record<string, typeof dbHistory>, item) => {
                    const key = item.version_group || item.id;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(item);
                    return acc;
                  }, {});
                  return Object.values(groups).map((versions) => {
                    const latest = versions[0];
                    const hasVersions = versions.length > 1;
                    return (
                      <div key={latest.id} className="history-item">
                        <div className="history-item-header">
                          <span className="history-date">{new Date(latest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{hasVersions && <span className="version-badge">{versions.length} versions</span>}</span>
                          <button className="settings-action-btn" onClick={() => navigator.clipboard.writeText(latest.generated_output)}>Copy</button>
                        </div>
                        <p className="history-post">{latest.generated_output}</p>
                        {hasVersions && (
                          <details className="version-history">
                            <summary className="version-summary">See all {versions.length} versions</summary>
                            {versions.slice(1).map((v, i) => (
                              <div key={v.id} className="version-item">
                                <span className="version-label">Version {versions.length - i - 1}</span>
                                <p className="history-post" style={{ fontSize: '0.82rem', opacity: 0.7 }}>{v.generated_output}</p>
                                {v.rejection_reason && <p className="version-rejection">Rejected: {v.rejection_reason}</p>}
                              </div>
                            ))}
                          </details>
                        )}
                        <p className="history-dump-label">Original dump</p>
                        <p className="history-dump">{latest.raw_input}</p>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE ── */}
        {section === 'profile' && (
          <div className="section-page">
            <div className="section-header"><h2 className="section-title">Profile</h2><p className="section-subtitle">How DumpPost knows you.</p></div>
            <div className="profile-grid">
              <div className="profile-card"><span className="profile-card-label">Name</span><span className="profile-card-value">{name || '—'}</span></div>
              <div className="profile-card"><span className="profile-card-label">Type</span><span className="profile-card-value" style={{ textTransform: 'capitalize' }}>{localStorage.getItem('dp-type') === 'employed' ? 'Working Professional' : localStorage.getItem('dp-type') === 'student' ? 'Student' : '—'}</span></div>
            </div>
            <div className="section-divider" />
            <div className="section-subheader"><h3 className="section-subtitle" style={{ color: 'var(--text)', marginBottom: '4px' }}>Your onboarding answers</h3><p className="section-subtitle">These shape how your posts sound like you.</p></div>
            <div className="answers-list">
              {(() => {
                const answers = JSON.parse(localStorage.getItem('dp-answers') || '[]');
                const type = localStorage.getItem('dp-type');
                const employedQuestions = ["What are you working on right now?","What's the most interesting part of it?","What's been giving you the most trouble with it?","Who do you want reading your posts — and what do you want them to think when they do?","What part of your work do you actually enjoy?","Anything specific you want DumpPost to keep in mind?"];
                const studentQuestions = ["What are you currently studying or learning?","What's the most interesting thing you've come across recently?","What's something you've been trying to figure out or struggling with?","Who do you want reading your posts — and what do you want them to think when they do?","What part of your field do you actually enjoy?","Anything specific you want DumpPost to keep in mind?"];
                const questions = type === 'student' ? studentQuestions : employedQuestions;
                if (answers.length === 0) return <p className="section-subtitle">No answers yet — complete onboarding first.</p>;
                return answers.map((answer: string, i: number) => (<div key={i} className="answer-item"><span className="answer-q">{questions[i]}</span><span className="answer-a">{answer}</span></div>));
              })()}
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {section === 'settings' && (
          <div className="section-page">
            <div className="section-header"><h2 className="section-title">Settings</h2><p className="section-subtitle">Manage your preferences.</p></div>
            <div className="settings-group">
              <p className="settings-group-label">Appearance</p>
              <div className="settings-row"><div className="settings-row-info"><span className="settings-row-title">Theme</span><span className="settings-row-desc">Switch between dark and light mode</span></div><button className="settings-toggle-btn" onClick={() => setDark(!dark)}>{dark ? '🌙 Dark' : '☀️ Light'}</button></div>
            </div>
            <div className="section-divider" />
            <div className="settings-group">
              <p className="settings-group-label">Account</p>
              <div className="settings-row"><div className="settings-row-info"><span className="settings-row-title">Email</span><span className="settings-row-desc">Your account email address</span></div><span className="settings-row-value">{email || '—'}</span></div>
              <div className="settings-row"><div className="settings-row-info"><span className="settings-row-title">Redo onboarding</span><span className="settings-row-desc">Reset your profile and answer questions again</span></div><button className="settings-action-btn" onClick={() => { localStorage.removeItem('dp-answers'); localStorage.removeItem('dp-type'); localStorage.removeItem('dp-name'); router.push('/onboarding'); }}>Reset</button></div>
              <div className="settings-row"><div className="settings-row-info"><span className="settings-row-title">Log out</span><span className="settings-row-desc">Sign out of your account</span></div><button className="settings-action-btn danger" onClick={handleLogout}>Log out</button></div>
              <div className="settings-row">
                <div className="settings-row-info"><span className="settings-row-title">Delete account</span><span className="settings-row-desc">Permanently delete your account and all your data</span></div>
                <button className="settings-action-btn danger" onClick={() => setShowDeleteConfirm(true)}>Delete account</button>
              </div>
            </div>
            <div className="section-divider" />
            <div className="settings-group">
              <p className="settings-group-label">Legal</p>
              <div className="settings-row"><div className="settings-row-info"><span className="settings-row-title">Privacy policy</span></div><button className="settings-action-btn" onClick={() => setSection('privacy')}>View →</button></div>
              <div className="settings-row"><div className="settings-row-info"><span className="settings-row-title">Usage policy</span></div><button className="settings-action-btn" onClick={() => setSection('usage')}>View →</button></div>
            </div>
          </div>
        )}

        {/* ── TUTORIALS ── */}
        {section === 'tutorials' && (
          <div className="section-page">
            <div className="section-header"><h2 className="section-title">Tutorials</h2><p className="section-subtitle">Learn how to get the most out of DumpPost.</p></div>
            <div className="tutorial-list">
              <div className="tutorial-item"><div className="tutorial-icon"><i className="ti ti-writing" /></div><div className="tutorial-content"><span className="tutorial-title">How to write a great dump</span><span className="tutorial-desc">The messier the better. Brain dump everything — bullet points, half sentences, voice note transcripts.</span></div></div>
              <div className="tutorial-item"><div className="tutorial-icon"><i className="ti ti-user-check" /></div><div className="tutorial-content"><span className="tutorial-title">Your voice profile</span><span className="tutorial-desc">DumpPost learns from your onboarding answers. You can redo onboarding anytime from Settings.</span></div></div>
              <div className="tutorial-item"><div className="tutorial-icon"><i className="ti ti-refresh" /></div><div className="tutorial-content"><span className="tutorial-title">Using Retry effectively</span><span className="tutorial-desc">Hit Retry and add more context. The more specific you are, the better the output.</span></div></div>
              <div className="tutorial-item"><div className="tutorial-icon"><i className="ti ti-history" /></div><div className="tutorial-content"><span className="tutorial-title">Your history</span><span className="tutorial-desc">Every post you generate is saved in History.</span></div></div>
            </div>
          </div>
        )}

        {/* ── PRIVACY ── */}
        {section === 'privacy' && (
          <div className="section-page">
            <div className="section-header"><h2 className="section-title">Privacy Policy</h2><p className="section-subtitle">Last updated: May 2026</p></div>
            <div className="policy-content">
              <div className="policy-block"><h3 className="policy-heading">What we collect</h3><p className="policy-text">We collect your email address, name, user type, and onboarding answers. We also store generated posts and raw input dumps.</p></div>
              <div className="policy-block"><h3 className="policy-heading">How we use it</h3><p className="policy-text">Your data is used solely to generate LinkedIn posts. We do not sell your data to third parties.</p></div>
              <div className="policy-block"><h3 className="policy-heading">Data storage</h3><p className="policy-text">Account data is stored securely via Supabase. Posts and onboarding answers are stored in local storage and on our servers.</p></div>
              <div className="policy-block"><h3 className="policy-heading">Your rights</h3><p className="policy-text">You can delete your account and all data at any time. Contact dumppostquery@gmail.com.</p></div>
              <div className="policy-block"><h3 className="policy-heading">Contact</h3><p className="policy-text">dumppostquery@gmail.com</p></div>
            </div>
          </div>
        )}

        {/* ── USAGE ── */}
        {section === 'usage' && (
          <div className="section-page">
            <div className="section-header"><h2 className="section-title">Usage Policy</h2><p className="section-subtitle">Last updated: May 2026</p></div>
            <div className="policy-content">
              <div className="policy-block"><h3 className="policy-heading">Acceptable use</h3><p className="policy-text">DumpPost is designed to help you create authentic LinkedIn content from your own thoughts.</p></div>
              <div className="policy-block"><h3 className="policy-heading">Prohibited use</h3><p className="policy-text">Do not use DumpPost to generate misleading, harmful, or plagiarized content.</p></div>
              <div className="policy-block"><h3 className="policy-heading">AI generated content</h3><p className="policy-text">Posts are based on your input. You are responsible for reviewing content before publishing.</p></div>
              <div className="policy-block"><h3 className="policy-heading">Beta terms</h3><p className="policy-text">DumpPost is in beta. Features may change and data may be migrated during this period.</p></div>            </div>
          </div>
        )}

        {/* ── PRICING ── */}
        {section === 'pricing' && (
  <div className="section-page">
    <div className="section-header">
      <h2 className="section-title">Plans</h2>
      <p className="section-subtitle">You're in early access. Here's what's coming.</p>
    </div>
    <div className="pricing-grid" style={{ margin: '0 auto', maxWidth: '860px' }}>
      <div className="pricing-card pricing-card-free">
        <div className="pricing-card-top">
          <span className="pricing-plan-name">Beta</span>
          <span className="pricing-plan-price">Free</span>
          <span className="pricing-plan-desc">Full access while we're in beta. No card needed, no catch.</span>
        </div>
        <div className="pricing-features">
          <div className="pricing-feature"><i className="ti ti-check" /><span>Unlimited post generation</span></div>
          <div className="pricing-feature"><i className="ti ti-check" /><span>Personal voice profiling</span></div>
          <div className="pricing-feature"><i className="ti ti-check" /><span>Post history</span></div>
          <div className="pricing-feature"><i className="ti ti-check" /><span>Early access to everything we ship</span></div>
        </div>
        <div className="pricing-card-footer"><span className="pricing-current-badge">Your current plan</span></div>
      </div>

      <div className="pricing-card pricing-card-pro">
        <div className="pricing-card-top">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="pricing-plan-name">Pro</span>
            <span className="pro-badge">Coming soon</span>
          </div>
          <span className="pricing-plan-price">Launching soon</span>
          <span className="pricing-plan-desc">Everything in Beta, plus:</span>
        </div>
        <div className="pricing-features">
          <div className="pricing-feature"><i className="ti ti-check" /><span>Everything in Beta</span></div>
          <div className="pricing-feature pro-locked"><i className="ti ti-lock" /><span>Multiple voice profiles — one per role or audience</span><span className="pro-tag">Pro</span></div>
          <div className="pricing-feature pro-locked"><i className="ti ti-lock" /><span>LinkedIn profile gap analysis — know what to post to grow</span><span className="pro-tag">Pro</span></div>
          <div className="pricing-feature pro-locked"><i className="ti ti-lock" /><span>Longer memory — gets smarter the more you use it</span><span className="pro-tag">Pro</span></div>
          <div className="pricing-feature pro-locked"><i className="ti ti-lock" /><span>Priority support</span><span className="pro-tag">Pro</span></div>
        </div>
        <div className="pricing-card-footer">
          <button className="settings-action-btn" onClick={() => window.location.href = 'mailto:dumppostquery@gmail.com?subject=DumpPost Pro Interest'}>Get notified →</button>
        </div>
      </div>
    </div>
    <p style={{ marginTop: '32px', fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
      Beta users get locked-in early pricing when Pro launches.
    </p>
  </div>
)}

      </div>

     {showDeleteConfirm && (
  <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
    <div className="modal-box" onClick={e => e.stopPropagation()}>
      <h3 className="modal-title">Delete account?</h3>
      <p className="modal-desc">This will permanently delete your account and all your posts. This cannot be undone.</p>
      <div className="modal-actions">
        <button className="feedback-btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
        <button className="feedback-btn reject" onClick={async () => {
          setShowDeleteConfirm(false);
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const res = await fetch('/api/delete-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: session.user.id }) });
              const data = await res.json();
              if (data.success) { await supabase.auth.signOut(); localStorage.clear(); router.push('/'); }
              else alert('Something went wrong. Please try again.');
            }
          } catch (e) { console.error(e); alert('Something went wrong.'); }
        }}>Delete account</button>
      </div>
    </div>
  </div>
)} 
    </main>
  );
}