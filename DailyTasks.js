import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DailyTasks.css';

/* ─── Default task bank ─── */
const DEFAULT_TASKS = [
  { id: 'water',     emoji: '💧', label: 'Drink water',          desc: 'Stay hydrated — 8 glasses a day',      xp: 10, category: 'body'  },
  { id: 'outside',   emoji: '🌤', label: 'Go outside',           desc: 'Get some fresh air & sunlight',         xp: 15, category: 'body'  },
  { id: 'journal',   emoji: '✍️', label: 'Write in journal',     desc: 'Reflect on your thoughts & feelings',   xp: 20, category: 'mind'  },
  { id: 'meditate',  emoji: '🧘', label: 'Meditate 5 min',       desc: 'Calm your mind with mindfulness',       xp: 20, category: 'mind'  },
  { id: 'exercise',  emoji: '🏃', label: 'Exercise / stretch',   desc: 'Move your body, boost your mood',       xp: 25, category: 'body'  },
  { id: 'sleep',     emoji: '😴', label: 'Sleep by 11 PM',       desc: 'Rest is your superpower',               xp: 15, category: 'body'  },
  { id: 'gratitude', emoji: '🙏', label: 'List 3 gratitudes',    desc: 'Shift focus to what is going well',     xp: 10, category: 'mind'  },
  { id: 'social',    emoji: '🫂', label: 'Connect with someone', desc: 'Reach out to a friend or family member',xp: 15, category: 'social'},
  { id: 'nophone',   emoji: '📵', label: 'Phone-free hour',      desc: 'Disconnect to reconnect with yourself', xp: 20, category: 'mind'  },
  { id: 'healthy',   emoji: '🥗', label: 'Eat something healthy',desc: 'Nourish your body with real food',       xp: 10, category: 'body'  },
  { id: 'create',    emoji: '🎨', label: 'Do something creative',desc: 'Draw, write, sing — express yourself',  xp: 15, category: 'social'},
  { id: 'read',      emoji: '📚', label: 'Read for 15 min',      desc: 'Feed your curiosity every day',         xp: 10, category: 'mind'  },
];

const CATEGORY_META = {
  body:   { label: 'Body',   color: '#1D9E75', bg: 'rgba(29,158,117,.12)' },
  mind:   { label: 'Mind',   color: '#7F77DD', bg: 'rgba(127,119,221,.12)' },
  social: { label: 'Social', color: '#D85A30', bg: 'rgba(216,90,48,.12)'  },
};

const QUOTES = [
  "Small steps every day lead to giant leaps over time. 🌱",
  "You don't have to be perfect — just consistent. 💪",
  "Taking care of yourself is not selfish, it's necessary. 🫶",
  "Every habit you build is an act of self-love. ✨",
  "Progress, not perfection. Keep going! 🚀",
  "Your future self will thank you for the choices you make today. 🌟",
];

function todayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function loadState() {
  try {
    const raw = localStorage.getItem('lumina_daily_tasks');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function saveState(s) {
  localStorage.setItem('lumina_daily_tasks', JSON.stringify(s));
}

/* ─── Confetti burst ─── */
function spawnConfetti(container) {
  const colors = ['#7F77DD','#1D9E75','#D85A30','#EF9F27','#D4537E','#5DCAA5'];
  for (let i = 0; i < 28; i++) {
    const el = document.createElement('div');
    el.className = 'dt-confetti-piece';
    el.style.cssText = `
      left: ${Math.random()*100}%;
      background: ${colors[Math.floor(Math.random()*colors.length)]};
      width: ${6+Math.random()*6}px;
      height: ${6+Math.random()*6}px;
      animation-duration: ${0.8+Math.random()*0.8}s;
      animation-delay: ${Math.random()*0.3}s;
      border-radius: ${Math.random()>0.5?'50%':'3px'};
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }
}

const DailyTasks = () => {
  const navigate = useNavigate();
  const confRef  = useRef(null);
  const quoteIdx = useRef(Math.floor(Math.random() * QUOTES.length));

  /* ── Load persisted state ── */
  const [state, setState] = useState(() => {
    const saved = loadState();
    const today = todayKey();
    if (saved && saved.date === today) return saved;
    // New day — reset completions but keep streaks & XP
    const base = saved || { streaks: {}, totalXP: 0, level: 1 };
    return {
      date: today,
      completed: {},
      streaks: base.streaks || {},
      totalXP: base.totalXP || 0,
      level: base.level || 1,
      customTasks: base.customTasks || [],
    };
  });

  const [filter, setFilter]     = useState('all');
  const [newTask, setNewTask]   = useState({ label: '', emoji: '⭐', category: 'mind' });
  const [addOpen, setAddOpen]   = useState(false);
  const [flash, setFlash]       = useState(null); // { id, xp }
  const [isDark, setIsDark]     = useState(true);

  /* persist on change */
  useEffect(() => { saveState(state); }, [state]);

  const allTasks = [...DEFAULT_TASKS, ...state.customTasks];
  const visible  = filter === 'all' ? allTasks : allTasks.filter(t => t.category === filter);
  const doneCount= Object.values(state.completed).filter(Boolean).length;
  const totalCount = allTasks.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const XP_PER_LEVEL = 100;
  const levelXP    = state.totalXP % XP_PER_LEVEL;
  const levelPct   = Math.round((levelXP / XP_PER_LEVEL) * 100);

  /* ── Toggle a task ── */
  const toggleTask = useCallback((task) => {
    setState(prev => {
      const wasOn = !!prev.completed[task.id];
      const xpDelta = wasOn ? -task.xp : task.xp;
      const newStreak = wasOn
        ? Math.max(0, (prev.streaks[task.id] || 0) - 1)
        : (prev.streaks[task.id] || 0) + 1;
      const newXP    = Math.max(0, prev.totalXP + xpDelta);
      const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
      return {
        ...prev,
        completed: { ...prev.completed, [task.id]: !wasOn },
        streaks:   { ...prev.streaks,   [task.id]: newStreak },
        totalXP: newXP,
        level: newLevel,
      };
    });
    if (!state.completed[task.id]) {
      setFlash({ id: task.id, xp: task.xp });
      if (confRef.current) spawnConfetti(confRef.current);
      setTimeout(() => setFlash(null), 1200);
    }
  }, [state.completed]);

  /* ── Add custom task ── */
  const addTask = () => {
    if (!newTask.label.trim()) return;
    const custom = {
      id: 'custom_' + Date.now(),
      emoji: newTask.emoji || '⭐',
      label: newTask.label.trim(),
      desc: 'Your personal self-care habit',
      xp: 15,
      category: newTask.category,
      custom: true,
    };
    setState(prev => ({ ...prev, customTasks: [...(prev.customTasks || []), custom] }));
    setNewTask({ label: '', emoji: '⭐', category: 'mind' });
    setAddOpen(false);
  };

  /* ── Delete custom task ── */
  const deleteTask = (id) => {
    setState(prev => ({
      ...prev,
      customTasks: (prev.customTasks || []).filter(t => t.id !== id),
      completed: { ...prev.completed, [id]: false },
    }));
  };

  const resetAll = () => {
    setState(prev => ({ ...prev, completed: {}, totalXP: 0, level: 1, streaks: {} }));
  };

  return (
    <div className={`dt-bg ${isDark ? 'dark' : 'light'}`}>
      {/* confetti layer */}
      <div ref={confRef} className="dt-confetti-layer" />

      {/* Orbs */}
      <div className="dt-orb" style={{ width:340,height:340,top:-80,left:-80,background:'#7F77DD' }} />
      <div className="dt-orb" style={{ width:260,height:260,top:100,right:-60,background:'#1D9E75' }} />
      <div className="dt-orb" style={{ width:180,height:180,bottom:40,left:60,background:'#D85A30' }} />

      <div className="dt-wrap">
        {/* ── Top bar ── */}
        <div className="dt-topbar">
          <button className="dt-back" onClick={() => navigate('/')}>← Home</button>
          <div className="dt-topbar-title">Daily Self-Care</div>
          <div className="dt-topbar-right">
            <button className="dt-theme-btn" onClick={() => setIsDark(d => !d)}>
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* ── Quote ── */}
        <div className="dt-quote">{QUOTES[quoteIdx.current]}</div>

        {/* ── XP & Level Bar ── */}
        <div className="dt-level-card">
          <div className="dt-level-left">
            <div className="dt-level-badge">Lv {state.level}</div>
            <div>
              <div className="dt-level-title">Wellness Level</div>
              <div className="dt-level-sub">{state.totalXP} XP total · {levelXP}/{XP_PER_LEVEL} to next level</div>
            </div>
          </div>
          <div className="dt-level-right">
            <div className="dt-xp-track">
              <div className="dt-xp-bar" style={{ width: levelPct + '%' }} />
            </div>
            <div className="dt-xp-pct">{levelPct}%</div>
          </div>
        </div>

        {/* ── Progress summary ── */}
        <div className="dt-progress-card">
          <div className="dt-prog-meta">
            <span className="dt-prog-label">Today's Progress</span>
            <span className="dt-prog-count">{doneCount} / {totalCount} tasks</span>
          </div>
          <div className="dt-prog-track">
            <div className="dt-prog-bar" style={{ width: pct + '%' }} />
          </div>
          <div className="dt-prog-pct">{pct}%</div>
        </div>

        {/* ── Filters ── */}
        <div className="dt-filter-row">
          {['all','body','mind','social'].map(f => (
            <button
              key={f}
              className={`dt-filter-btn ${filter === f ? 'on' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '✨ All' : `${CATEGORY_META[f].label}`}
            </button>
          ))}
          <button className="dt-filter-btn dt-add-btn" onClick={() => setAddOpen(o => !o)}>
            {addOpen ? '✕ Cancel' : '＋ Add Habit'}
          </button>
        </div>

        {/* ── Add custom habit form ── */}
        {addOpen && (
          <div className="dt-add-form">
            <input
              className="dt-input"
              placeholder="Habit name (e.g. Stretch 10 min)"
              value={newTask.label}
              onChange={e => setNewTask(p => ({ ...p, label: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
            <input
              className="dt-input dt-emoji-input"
              placeholder="Emoji"
              value={newTask.emoji}
              maxLength={2}
              onChange={e => setNewTask(p => ({ ...p, emoji: e.target.value }))}
            />
            <select
              className="dt-input dt-select"
              value={newTask.category}
              onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))}
            >
              <option value="body">Body</option>
              <option value="mind">Mind</option>
              <option value="social">Social</option>
            </select>
            <button className="dt-submit-btn" onClick={addTask}>Add</button>
          </div>
        )}

        {/* ── Task list ── */}
        <div className="dt-task-grid">
          {visible.map(task => {
            const done    = !!state.completed[task.id];
            const streak  = state.streaks[task.id] || 0;
            const catMeta = CATEGORY_META[task.category];
            const isFlash = flash && flash.id === task.id;
            return (
              <div
                key={task.id}
                className={`dt-task-card ${done ? 'done' : ''} ${isFlash ? 'flash' : ''}`}
                onClick={() => toggleTask(task)}
              >
                {/* XP flash */}
                {isFlash && (
                  <div className="dt-xp-flash">+{flash.xp} XP 🎉</div>
                )}

                <div className="dt-task-top">
                  <div className="dt-task-emoji">{task.emoji}</div>
                  <div className="dt-task-info">
                    <div className="dt-task-label">{task.label}</div>
                    <div className="dt-task-desc">{task.desc}</div>
                  </div>
                  <div className={`dt-task-check ${done ? 'checked' : ''}`}>
                    {done ? '✓' : ''}
                  </div>
                </div>

                <div className="dt-task-meta">
                  <span
                    className="dt-cat-badge"
                    style={{ color: catMeta.color, background: catMeta.bg }}
                  >{catMeta.label}</span>
                  <span className="dt-xp-tag">+{task.xp} XP</span>
                  {streak > 0 && (
                    <span className="dt-streak">🔥 {streak}d streak</span>
                  )}
                  {task.custom && (
                    <button
                      className="dt-delete-btn"
                      onClick={e => { e.stopPropagation(); deleteTask(task.id); }}
                      title="Remove habit"
                    >✕</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Completion banner ── */}
        {doneCount === totalCount && totalCount > 0 && (
          <div className="dt-complete-banner">
            🎊 You completed all tasks today! Amazing job! 🎊
          </div>
        )}

        {/* ── Footer actions ── */}
        <div className="dt-footer">
          <button className="dt-reset-btn" onClick={resetAll}>↺ Reset today</button>
        </div>
      </div>
    </div>
  );
};

export default DailyTasks;
