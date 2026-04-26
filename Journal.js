import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Journal.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:8000';
const API = `${BACKEND_URL}/api`;

const MOOD_PROMPTS = [
  'How do you feel today?',
  'What is weighing on your mind right now?',
  'What are you grateful for today?',
  'Describe your mood in a few words.',
  'What happened today that affected you?',
  'What would make tomorrow better?',
  'Write about one thing you are proud of.',
];

const EMOTION_META = {
  stressed:   { emoji: '😰', color: '#f87171', label: 'Stressed' },
  anxious:    { emoji: '😟', color: '#fb923c', label: 'Anxious' },
  sad:        { emoji: '😢', color: '#60a5fa', label: 'Sad' },
  happy:      { emoji: '😊', color: '#4ade80', label: 'Happy' },
  joyful:     { emoji: '😄', color: '#facc15', label: 'Joyful' },
  hopeful:    { emoji: '🌟', color: '#a78bfa', label: 'Hopeful' },
  angry:      { emoji: '😡', color: '#f43f5e', label: 'Angry' },
  calm:       { emoji: '😌', color: '#34d399', label: 'Calm' },
  tired:      { emoji: '😴', color: '#94a3b8', label: 'Tired' },
  overwhelmed:{ emoji: '🤯', color: '#f97316', label: 'Overwhelmed' },
  lonely:     { emoji: '🥺', color: '#818cf8', label: 'Lonely' },
  reflective: { emoji: '🤔', color: '#38bdf8', label: 'Reflective' },
};

const getEmotionMeta = (emotion = '') => {
  const key = emotion.toLowerCase().trim();
  for (const [k, v] of Object.entries(EMOTION_META)) {
    if (key.includes(k)) return v;
  }
  return { emoji: '💭', color: '#38bdf8', label: emotion || 'Reflective' };
};

const formatDate = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

// ── Confetti ──────────────────────────────────────────
const CONF_COLORS = ['#7F77DD','#1D9E75','#F59E0B','#EC4899','#38BDF8','#A78BFA'];
function Confetti({ active }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!active) { setPieces([]); return; }
    setPieces(Array.from({ length: 38 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: CONF_COLORS[i % CONF_COLORS.length],
      size: `${6 + Math.random() * 8}px`,
      delay: `${Math.random() * 0.5}s`,
      dur: `${1.2 + Math.random() * 0.8}s`,
    })));
    const t = setTimeout(() => setPieces([]), 2200);
    return () => clearTimeout(t);
  }, [active]);
  if (!pieces.length) return null;
  return (
    <div className="jn-conf-layer">
      {pieces.map(p => (
        <div key={p.id} className="jn-conf-piece" style={{
          left: p.left, background: p.color,
          width: p.size, height: p.size,
          animationDuration: p.dur, animationDelay: p.delay,
        }} />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────
export default function Journal() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id') || 'anonymous';

  const [dark, setDark] = useState(true);
  const [content, setContent] = useState('');
  const [moodPrompt, setMoodPrompt] = useState(MOOD_PROMPTS[0]);
  const [saving, setSaving] = useState(false);
  const [latestSave, setLatestSave] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [confetti, setConfetti] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [wordCount, setWordCount] = useState(0);

  // Randomise prompt on load
  useEffect(() => {
    setMoodPrompt(MOOD_PROMPTS[Math.floor(Math.random() * MOOD_PROMPTS.length)]);
    fetchEntries();
  }, []);

  useEffect(() => {
    setWordCount(content.trim() ? content.trim().split(/\s+/).length : 0);
  }, [content]);

  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const res = await axios.get(`${API}/journal/entries`, { params: { user_id: userId } });
      setEntries(res.data || []);
    } catch (e) {
      console.error('Journal fetch error', e);
    } finally {
      setLoadingEntries(false);
    }
  }, [userId]);

  const handleSave = async () => {
    if (!content.trim() || content.trim().length < 10) return;
    if (userId === 'anonymous') {
      alert('Please log in to save your journal entries.');
      navigate('/login');
      return;
    }
    setSaving(true);
    try {
      const res = await axios.post(`${API}/journal/save`, {
        user_id: userId,
        content: content.trim(),
        mood_prompt: moodPrompt,
      });
      setLatestSave(res.data);
      setContent('');
      setConfetti(true);
      setTimeout(() => setConfetti(false), 2200);
      // Prepend to list
      setEntries(prev => [res.data, ...prev]);
    } catch (e) {
      console.error('Journal save error', e);
      alert('Could not save entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await axios.delete(`${API}/journal/${id}`, { params: { user_id: userId } });
      setEntries(prev => prev.filter(e => e.id !== id));
      if (latestSave?.id === id) setLatestSave(null);
    } catch (e) {
      console.error('Delete error', e);
    } finally {
      setDeletingId(null);
    }
  };

  const pickRandomPrompt = () => {
    let next;
    do { next = MOOD_PROMPTS[Math.floor(Math.random() * MOOD_PROMPTS.length)]; } while (next === moodPrompt);
    setMoodPrompt(next);
  };

  return (
    <div className={`jn-bg ${dark ? 'dark' : 'light'}`}>
      <Confetti active={confetti} />

      {/* ── Ambient orbs ── */}
      <div className="jn-orb" style={{ width:420, height:420, top:-120, left:-120, background: dark ? 'rgba(127,119,221,0.18)' : 'rgba(127,119,221,0.1)' }} />
      <div className="jn-orb" style={{ width:320, height:320, bottom:-80, right:-80, background: dark ? 'rgba(29,158,117,0.15)' : 'rgba(29,158,117,0.09)' }} />

      <div className="jn-wrap">

        {/* ── Top bar ── */}
        <div className="jn-topbar">
          <button className="jn-back" onClick={() => navigate(-1)}>← Back</button>
          <div className="jn-topbar-center">
            <span className="jn-topbar-icon">✍️</span>
            <span className="jn-topbar-title">My Journal</span>
          </div>
          <button className="jn-theme-btn" onClick={() => setDark(d => !d)}>{dark ? '☀️' : '🌙'}</button>
        </div>

        {/* ── Motivational banner ── */}
        <div className="jn-banner">
          <span className="jn-banner-icon">🌸</span>
          <span className="jn-banner-text">Writing is the bridge between your thoughts and healing. Every entry matters.</span>
        </div>

        {/* ── Editor card ── */}
        <div className="jn-card jn-editor-card">
          <div className="jn-prompt-row">
            <p className="jn-prompt-text">"{moodPrompt}"</p>
            <button className="jn-prompt-shuffle" onClick={pickRandomPrompt} title="New prompt">🎲</button>
          </div>

          <textarea
            className="jn-textarea"
            placeholder="Start writing here... Let your thoughts flow freely. This is your safe space 💙"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={8}
          />

          <div className="jn-editor-footer">
            <span className="jn-wordcount">{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
            <button
              className={`jn-save-btn ${saving ? 'saving' : ''}`}
              onClick={handleSave}
              disabled={saving || content.trim().length < 10}
            >
              {saving ? '✨ Analyzing…' : '💾 Save Entry'}
            </button>
          </div>
        </div>

        {/* ── AI Summary (latest save) ── */}
        {latestSave && (
          <div className="jn-ai-summary-card">
            <div className="jn-ai-summary-header">
              <span>{getEmotionMeta(latestSave.detected_emotion).emoji} AI Insight</span>
              <span className="jn-emotion-badge" style={{ background: getEmotionMeta(latestSave.detected_emotion).color + '22', color: getEmotionMeta(latestSave.detected_emotion).color }}>
                {getEmotionMeta(latestSave.detected_emotion).label}
              </span>
            </div>
            <p className="jn-ai-summary-text">"{latestSave.ai_summary}"</p>
            <p className="jn-ai-summary-tip">💡 Consider talking to Lumina about how you're feeling.</p>
            <button className="jn-chat-btn" onClick={() => navigate('/chat')}>Chat with Lumina →</button>
          </div>
        )}

        {/* ── Past Entries ── */}
        <div className="jn-section-header">
          <span className="jn-section-title">📖 Past Entries</span>
          <span className="jn-entry-count">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
        </div>

        {loadingEntries ? (
          <div className="jn-loading">Loading your journal…</div>
        ) : entries.length === 0 ? (
          <div className="jn-empty">
            <div className="jn-empty-icon">📔</div>
            <p>No entries yet. Write your first one above!</p>
          </div>
        ) : (
          <div className="jn-entries-list">
            {entries.map(entry => {
              const meta = getEmotionMeta(entry.detected_emotion);
              const expanded = expandedId === entry.id;
              return (
                <div key={entry.id} className={`jn-entry-card ${expanded ? 'expanded' : ''}`}>
                  <div className="jn-entry-header" onClick={() => setExpandedId(expanded ? null : entry.id)}>
                    <div className="jn-entry-emotion-dot" style={{ background: meta.color }}>
                      {meta.emoji}
                    </div>
                    <div className="jn-entry-meta">
                      <span className="jn-entry-date">{formatDate(entry.timestamp)}</span>
                      <span className="jn-entry-feeling" style={{ color: meta.color }}>{meta.label}</span>
                    </div>
                    <div className="jn-entry-preview">{entry.content.substring(0, 60)}{entry.content.length > 60 ? '…' : ''}</div>
                    <span className="jn-entry-chevron">{expanded ? '▲' : '▼'}</span>
                  </div>

                  {expanded && (
                    <div className="jn-entry-body">
                      <p className="jn-entry-prompt-label">Prompt: <em>"{entry.mood_prompt}"</em></p>
                      <p className="jn-entry-content">{entry.content}</p>
                      <div className="jn-entry-ai-row">
                        <span className="jn-ai-tag">🤖 AI Insight</span>
                        <p className="jn-entry-summary">"{entry.ai_summary}"</p>
                      </div>
                      <button
                        className="jn-delete-btn"
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                      >
                        {deletingId === entry.id ? 'Deleting…' : '🗑 Delete'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
