import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartNotifications } from '../hooks/useSmartNotifications';
import './NotificationBell.css';

const PREVIEW_MESSAGES = [
  { icon: '💙', text: '"How are you feeling today?"', type: 'Mood Check-in', interval: 'Every 4 hrs' },
  { icon: '🌬️', text: '"Don\'t forget your breathing exercise"', type: 'Breathing', interval: 'Every 3 hrs' },
  { icon: '✍️', text: '"Your journal is waiting for you"', type: 'Journal', interval: 'Every 6 hrs' },
  { icon: '✅', text: '"Complete your self-care tasks today"', type: 'Daily Tasks', interval: 'Every 5 hrs' },
  { icon: '☀️', text: '"You are doing better than you think"', type: 'Encouragement', interval: 'Every 2 hrs' },
];

export default function NotificationBell() {
  const navigate = useNavigate();
  const { enableNotifications, disableNotifications, getStatus } = useSmartNotifications(navigate);

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('default');
  const [animateBell, setAnimateBell] = useState(false);
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  useEffect(() => {
    setStatus(getStatus());
  }, [getStatus]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current && !bellRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Gently ring bell every 30s as a reminder
  useEffect(() => {
    if (status !== 'enabled') return;
    const t = setInterval(() => {
      setAnimateBell(true);
      setTimeout(() => setAnimateBell(false), 800);
    }, 30000);
    return () => clearInterval(t);
  }, [status]);

  const handleToggle = async () => {
    if (status === 'enabled') {
      disableNotifications();
      setStatus('disabled');
    } else if (status === 'disabled') {
      localStorage.setItem('lumina_notif_enabled', 'true');
      setStatus('enabled');
    } else {
      // Ask permission
      const ok = await enableNotifications(navigate);
      setStatus(ok ? 'enabled' : 'denied');
    }
  };

  const isOn = status === 'enabled';
  const isDenied = status === 'denied';
  const isUnsupported = status === 'unsupported';

  return (
    <>
      {/* Bell trigger */}
      <button
        ref={bellRef}
        className={`nb-bell ${isOn ? 'on' : ''} ${animateBell ? 'ring' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Smart Notifications"
        aria-label="Notification settings"
      >
        {isOn ? '🔔' : '🔕'}
        {isOn && <span className="nb-dot" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="nb-panel" ref={panelRef}>
          <div className="nb-panel-header">
            <span className="nb-panel-title">🔔 Smart Notifications</span>
            <button className="nb-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <p className="nb-panel-sub">
            {isOn
              ? 'Notifications are ON. Lumina will check in with you regularly.'
              : isDenied
              ? 'Notifications were blocked. Please enable them in your browser settings.'
              : isUnsupported
              ? 'Your browser doesn\'t support notifications.'
              : 'Turn on smart reminders from Lumina AI.'}
          </p>

          {/* Toggle */}
          {!isDenied && !isUnsupported && (
            <button
              className={`nb-toggle-btn ${isOn ? 'on' : 'off'}`}
              onClick={handleToggle}
            >
              {isOn ? '🔕 Turn Off Notifications' : '🔔 Turn On Notifications'}
            </button>
          )}

          {isDenied && (
            <div className="nb-denied-hint">
              <p>To enable: Click the 🔒 lock icon in your browser address bar → Allow Notifications → Refresh.</p>
            </div>
          )}

          {/* Preview list */}
          <div className="nb-preview-header">What you'll receive:</div>
          <div className="nb-preview-list">
            {PREVIEW_MESSAGES.map((m, i) => (
              <div key={i} className={`nb-preview-item ${!isOn ? 'dim' : ''}`}>
                <span className="nb-preview-icon">{m.icon}</span>
                <div className="nb-preview-text">
                  <div className="nb-preview-type">{m.type} <span className="nb-interval">{m.interval}</span></div>
                  <div className="nb-preview-msg">{m.text}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="nb-panel-footer">
            Notifications only show while this tab is open.
          </div>
        </div>
      )}
    </>
  );
}
