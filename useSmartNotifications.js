/**
 * useSmartNotifications.js
 * Schedules and fires smart browser notifications for Lumina AI.
 *
 * Schedule (while the app is open):
 *  - Every 4 hours  → "How are you feeling today?"
 *  - Every 3 hours  → Breathing exercise reminder
 *  - Every 6 hours  → Journal reminder
 *  - Every 5 hours  → Daily tasks reminder
 *  - Every 2 hours  → Kind encouragement quote
 *
 * localStorage keys used:
 *  lumina_notif_permission    – "granted" | "denied" | "default"
 *  lumina_notif_enabled       – "true" | "false"
 *  lumina_notif_last_<type>   – ISO timestamp of last fire
 */

import { useEffect, useRef, useCallback } from 'react';

const ICON = '/favicon.ico';

const NOTIFICATIONS = {
  moodCheckin: {
    key:     'mood',
    title:   'Lumina AI 💙',
    messages: [
      'How are you feeling today? I\'m here to listen.',
      'Hey! Take a moment to check in with yourself. How are you?',
      'Your mental health matters. How\'s your mood right now?',
    ],
    intervalMs: 4 * 60 * 60 * 1000, // 4 hours
    path: '/chat',
  },
  breathing: {
    key:     'breathing',
    title:   '🌬️ Breathing Reminder',
    messages: [
      'Don\'t forget your breathing exercise. 2 minutes can change your whole mood.',
      'Feeling stressed? Try a quick breathing exercise right now.',
      'Take a deep breath. Your 4-7-8 breathing session is waiting for you.',
    ],
    intervalMs: 3 * 60 * 60 * 1000, // 3 hours
    path: '/breathing',
  },
  journal: {
    key:     'journal',
    title:   '✍️ Journal Reminder',
    messages: [
      'Take 5 minutes to write in your journal. Your thoughts deserve a space.',
      'How was your day? Write it down — it helps more than you think.',
      'Your Daily Journal is waiting. Even a few sentences counts.',
    ],
    intervalMs: 6 * 60 * 60 * 1000, // 6 hours
    path: '/journal',
  },
  tasks: {
    key:     'tasks',
    title:   '✅ Daily Self-Care',
    messages: [
      'Have you completed your self-care tasks today? Small habits = big changes.',
      'Don\'t forget to drink water, go outside and move your body today 💧',
      'Your daily tasks are waiting — every habit you build shapes your wellbeing.',
    ],
    intervalMs: 5 * 60 * 60 * 1000, // 5 hours
    path: '/tasks',
  },
  encouragement: {
    key:     'encourage',
    title:   '☀️ Lumina Reminder',
    messages: [
      'You are doing better than you think. Keep going 💪',
      'Progress, not perfection. Every small step counts.',
      'Be kind to yourself today. You deserve the same compassion you give others.',
      'Remember: asking for help is a sign of strength, not weakness.',
    ],
    intervalMs: 2 * 60 * 60 * 1000, // 2 hours
    path: null,
  },
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getLastFired(key) {
  const val = localStorage.getItem(`lumina_notif_last_${key}`);
  return val ? new Date(val).getTime() : 0;
}

function setLastFired(key) {
  localStorage.setItem(`lumina_notif_last_${key}`, new Date().toISOString());
}

function isEnabled() {
  return localStorage.getItem('lumina_notif_enabled') !== 'false';
}

function fireNotification(type, navigate) {
  if (!isEnabled()) return;
  if (Notification.permission !== 'granted') return;

  const cfg = NOTIFICATIONS[type];
  const now = Date.now();
  const last = getLastFired(cfg.key);

  if (now - last < cfg.intervalMs) return; // too soon

  const body = pickRandom(cfg.messages);
  const notif = new Notification(cfg.title, {
    body,
    icon: ICON,
    badge: ICON,
    tag: `lumina-${cfg.key}`,
    requireInteraction: false,
    silent: false,
  });

  setLastFired(cfg.key);

  if (cfg.path && navigate) {
    notif.onclick = () => {
      window.focus();
      navigate(cfg.path);
      notif.close();
    };
  }

  // Auto-close after 8 seconds
  setTimeout(() => notif.close(), 8000);
}

export function useSmartNotifications(navigate) {
  const intervalRef = useRef(null);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    const result = await Notification.requestPermission();
    localStorage.setItem('lumina_notif_permission', result);
    return result;
  }, []);

  const enableNotifications = useCallback(async (navigate) => {
    const perm = await requestPermission();
    if (perm === 'granted') {
      localStorage.setItem('lumina_notif_enabled', 'true');
      // Fire a welcome notification immediately
      new Notification('Lumina AI 💙', {
        body: 'Smart notifications are on! I\'ll check in with you regularly.',
        icon: ICON,
        tag: 'lumina-welcome',
      });
      return true;
    }
    return false;
  }, [requestPermission]);

  const disableNotifications = useCallback(() => {
    localStorage.setItem('lumina_notif_enabled', 'false');
  }, []);

  const getStatus = useCallback(() => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    if (!isEnabled()) return 'disabled';
    if (Notification.permission === 'granted') return 'enabled';
    return 'default';
  }, []);

  // Poll every 5 minutes — check if any notification is due
  useEffect(() => {
    if (!('Notification' in window)) return;

    const check = () => {
      if (Notification.permission !== 'granted' || !isEnabled()) return;
      Object.keys(NOTIFICATIONS).forEach(type => {
        fireNotification(type, navigate);
      });
    };

    // Check immediately on mount (with small delay)
    const initTimer = setTimeout(check, 3000);

    // Then every 5 minutes
    intervalRef.current = setInterval(check, 5 * 60 * 1000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalRef.current);
    };
  }, [navigate]);

  return { enableNotifications, disableNotifications, getStatus, requestPermission };
}
