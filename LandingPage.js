import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/landing.css';
import SmartModeModal from '../components/SmartModeModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
const API = `${BACKEND_URL}/api`;

const companions = [
  { id: 'companion', name: 'General Companion', icon: '🤖', description: 'Empathetic AI counselor with expert knowledge in psychology.' },
  { id: 'anxiety', name: 'Calm Coach', icon: '😌', description: 'Focuses on breathing, grounding techniques, and stress management.' },
  { id: 'mindful', name: 'Mindful Guide', icon: '🌿', description: 'Uses wise, serene language focused on present-moment awareness.' },
  { id: 'friend', name: 'Caring Friend', icon: '🫂', description: 'Informal, warm, and highly supportive, relatable conversation.' },
  { id: 'wellness', name: 'Wellness Mentor', icon: '🌅', description: 'Focuses on motivation, healthy habits, and physical well-being.' },
  { id: 'crisis', name: 'Crisis Specialist', icon: '❤️', description: 'Urgent, calm, and provides immediate support and resources.' },
  { id: 'music', name: 'Music Therapist', icon: '🎵', description: 'Focuses on the emotional power of sound and music to heal the mind.' },
  { id: 'nutritionist', name: 'Food Habits', icon: '🥗', description: 'Your personalized AI wellness assistant for tracking mood, diet, and healthy lifestyle changes.' },
];

const FEATURES = [
  { icon: '💡', label: 'CBT Thought Diary',  desc: 'Identify & reframe negative thoughts', path: '/cbt',       grad: 'linear-gradient(135deg,#a855f7,#6366f1)' },
  { icon: '✍️', label: 'Daily Journal',       desc: 'Write & get AI mood insights',          path: '/journal',   grad: 'linear-gradient(135deg,#f59e0b,#d85a30)' },
  { icon: '🌬', label: 'Breathing Guide',     desc: 'Guided mindful breathing exercises',    path: '/breathing',  grad: 'linear-gradient(135deg,#10b981,#059669)' },
  { icon: '✅', label: 'Daily Tasks',         desc: 'Track self-care habits & earn XP',       path: '/tasks',      grad: 'linear-gradient(135deg,#7F77DD,#D85A30)' },
  { icon: '🎵', label: 'Music Therapy',       desc: 'Heal with curated soundscapes',          path: '/music',      grad: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  { icon: '📊', label: 'XAI Transparency',    desc: 'See how the AI understands you',         path: '/xai',        grad: 'linear-gradient(135deg,#38bdf8,#3b82f6)' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [isSmartModalOpen, setIsSmartModalOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const featuresRef  = useRef(null);
  const triggerRef   = useRef(null);
  const dropdownRef  = useRef(null);

  useEffect(() => {
    const user = localStorage.getItem('user_id');
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  useEffect(() => {
    if (currentUser && currentUser !== 'anonymous') {
      const fetchHistory = async () => {
        try {
          const res = await axios.get(`${API}/conversations`, { params: { user_id: currentUser } });
          const uniqueTopics = [];
          const viewed = new Set();
          for (let conv of res.data) {
            const topic = conv.user_message.substring(0, 40) + '...';
            if (!viewed.has(topic) && topic.length > 5) {
              uniqueTopics.push({ topic, emotion: conv.emotion, date: new Date(conv.timestamp).toLocaleDateString() });
              viewed.add(topic);
            }
            if (uniqueTopics.length >= 3) break;
          }
          setRecentHistory(uniqueTopics);
        } catch (err) {
          console.error('Could not fetch quick history:', err);
        }
      };
      // fetchHistory();
    }
  }, [currentUser]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      const inTrigger   = featuresRef.current  && featuresRef.current.contains(e.target);
      const inDropdown  = dropdownRef.current  && dropdownRef.current.contains(e.target);
      if (!inTrigger && !inDropdown) {
        setFeaturesOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user_id');
    localStorage.removeItem('token');
    setCurrentUser(null);
    setRecentHistory([]);
  };

  const handleProtectedNav = (path) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    navigate(path);
  };

  const handleSelectCompanion = (type) => {
    navigate('/chat', { state: { type } });
  };

  return (
    <div className="page-bg">

      {/* Grid overlay */}
      <div className="grid-overlay"></div>

      {/* Ambient orbs */}
      <div className="orb" style={{width:'320px',height:'320px',background:'rgba(79,195,212,0.06)',top:'5%',left:'-5%',animationDuration:'14s'}}></div>
      <div className="orb" style={{width:'220px',height:'220px',background:'rgba(72,120,200,0.07)',top:'20%',right:'-4%',animationDuration:'11s',animationDelay:'3s'}}></div>
      <div className="orb" style={{width:'180px',height:'180px',background:'rgba(32,160,160,0.06)',bottom:'20%',left:'10%',animationDuration:'16s',animationDelay:'6s'}}></div>
      <div className="orb" style={{width:'140px',height:'140px',background:'rgba(100,180,200,0.05)',bottom:'30%',right:'15%',animationDuration:'13s',animationDelay:'2s'}}></div>
      <div className="orb" style={{width:'90px',height:'90px',background:'rgba(79,195,212,0.07)',top:'50%',left:'45%',animationDuration:'9s',animationDelay:'4s'}}></div>

      {/* Rising particles */}
      <div className="particle" style={{width:'5px',height:'5px',background:'rgba(79,195,212,0.55)',left:'8%',bottom:'0',animationDuration:'14s',animationDelay:'0s'}}></div>
      <div className="particle" style={{width:'4px',height:'4px',background:'rgba(130,200,220,0.5)',left:'20%',bottom:'0',animationDuration:'17s',animationDelay:'2s'}}></div>
      <div className="particle" style={{width:'6px',height:'6px',background:'rgba(79,195,212,0.4)',left:'35%',bottom:'0',animationDuration:'12s',animationDelay:'5s'}}></div>
      <div className="particle" style={{width:'3px',height:'3px',background:'rgba(160,220,230,0.6)',left:'50%',bottom:'0',animationDuration:'19s',animationDelay:'1s'}}></div>
      <div className="particle" style={{width:'5px',height:'5px',background:'rgba(79,195,212,0.45)',left:'65%',bottom:'0',animationDuration:'15s',animationDelay:'3.5s'}}></div>
      <div className="particle" style={{width:'4px',height:'4px',background:'rgba(100,200,215,0.5)',left:'78%',bottom:'0',animationDuration:'11s',animationDelay:'7s'}}></div>
      <div className="particle" style={{width:'6px',height:'6px',background:'rgba(79,195,212,0.35)',left:'90%',bottom:'0',animationDuration:'16s',animationDelay:'4s'}}></div>
      <div className="particle" style={{width:'3px',height:'3px',background:'rgba(140,210,225,0.55)',left:'55%',bottom:'0',animationDuration:'13s',animationDelay:'9s'}}></div>
      <div className="particle" style={{width:'5px',height:'5px',background:'rgba(79,195,212,0.4)',left:'28%',bottom:'0',animationDuration:'20s',animationDelay:'6s'}}></div>
      <div className="particle" style={{width:'4px',height:'4px',background:'rgba(100,195,212,0.5)',left:'72%',bottom:'0',animationDuration:'18s',animationDelay:'2.5s'}}></div>

      {/* Wave bands */}
      <div className="wave" style={{top:'28%',animationDuration:'18s',animationDelay:'0s'}}></div>
      <div className="wave" style={{top:'55%',animationDuration:'24s',animationDelay:'6s'}}></div>
      <div className="wave" style={{top:'75%',animationDuration:'20s',animationDelay:'12s'}}></div>

      <div className="content">
        <nav>
          <div className="nav-greeting" style={{ fontSize: '18px', fontWeight: 'bold' }}>
            Lumina AI <span className="sparkle" style={{ fontSize: '16px' }}>✨</span>
          </div>

          <div className="nav-btns">
            {currentUser ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '14px', color: '#fff' }}>Hi, <span style={{ fontWeight: 600 }}>{currentUser}!</span></div>
                  <button className="nbtn btn-logout" onClick={handleLogout}>Logout</button>
                </div>
            ) : (
                <button className="nbtn btn-login" onClick={() => navigate('/login')}>Login / Sign Up</button>
            )}

            <div className="lp-feat-wrap" ref={featuresRef}>
              <button
                ref={triggerRef}
                className="nbtn btn-features"
                onClick={() => {
                  if (!featuresOpen && triggerRef.current) {
                    const rect = triggerRef.current.getBoundingClientRect();
                    setDropdownPos({
                      top: rect.bottom + 8,
                      right: window.innerWidth - rect.right,
                    });
                  }
                  setFeaturesOpen(o => !o);
                }}
                aria-expanded={featuresOpen}
              >
                ✨ Features ▾
              </button>
            </div>

            {featuresOpen && ReactDOM.createPortal(
              <div
                ref={dropdownRef}
                className="lp-feat-dropdown"
                style={{
                  position: 'fixed',
                  top: dropdownPos.top,
                  right: dropdownPos.right,
                  left: 'auto',
                  zIndex: 99999,
                }}
              >
                <div className="lp-feat-dropdown-header">Explore Lumina's Tools</div>
                {FEATURES.map(f => (
                  <button
                    key={f.path}
                    className="lp-feat-item"
                    onMouseDown={(e) => {
                      e.preventDefault(); 
                      setFeaturesOpen(false);
                      handleProtectedNav(f.path);
                    }}
                  >
                    <div className="lp-feat-item-icon" style={{ background: f.grad }}>{f.icon}</div>
                    <div className="lp-feat-item-text">
                      <div className="lp-feat-item-label">{f.label}</div>
                      <div className="lp-feat-item-desc">{f.desc}</div>
                    </div>
                    <span className="lp-feat-item-arrow">→</span>
                  </button>
                ))}
              </div>,
              document.body
            )}

            <button className="nbtn btn-history" onClick={() => handleProtectedNav('/history')}>🕐 History</button>
            <button className="nbtn btn-feedback" onClick={() => currentUser ? navigate('/feedback') : navigate('/login')}>💬 Feedback</button>
          </div>
        </nav>

        <div className="hero">
          <div className="hero-title">Lumina AI ✨</div>
          <div className="hero-sub">Your personalized mental health companion, powered by emotion-aware AI.</div>

          <div className="hero-card">
            <div className="hc-left">
              <h2>Personal AI Support for Your Mental Health & Wellbeing</h2>
              <p>Get instant, private support for stress, anxiety, decisions, and personal growth. Available 24/7 to help you understand your emotions, build better habits, and navigate life's challenges. Your conversations remain completely confidential.</p>
            </div>
            <div className="hc-right">
              <div className="bot-emoji">🤖</div>
              <p>Ready to talk? I'm here to support you.</p>
              <button className="btn-chat-lumina" onClick={() => setIsSmartModalOpen(true)}>Chat With Lumina</button>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="sec-title">🤖 Choose Your AI Companion</div>
          <div className="personas-grid">
            {companions.map((comp) => (
               <div className="pcard" key={comp.id} onClick={() => handleSelectCompanion(comp.id)}>
                  <span className="pcard-icon">{comp.icon}</span>
                  <h3>{comp.name}</h3>
                  <p>{comp.description}</p>
                  <button className="btn-start-session">Start Session</button>
               </div>
            ))}
          </div>
        </div>

        <div className="stats-bg">
          <div className="stats-grid">
            <div className="stat-card sc-purple">
              <span className="stat-icon">💜</span>
              <h3>85% feel better after their first conversation</h3>
              <div className="stat-desc">For 40% of cases that's the only help needed.</div>
              <div className="chips-row">
                <span className="schip">Anxiety</span>
                <span className="schip">Stress</span>
                <span className="schip">Navigating relationships</span>
                <span className="schip">Emotional regulation</span>
                <span className="schip">Work burnout</span>
                <span className="schip">Loneliness</span>
                <span className="schip">Negative self-talk</span>
                <span className="schip">Low confidence</span>
              </div>
            </div>
            <div className="stat-card sc-teal">
              <span className="stat-icon">✅</span>
              <h3>Available 24/7</h3>
              <div className="stat-desc">No appointments or waiting rooms. Instant replies even on weekends and at 4 A.M.</div>
              <div className="big-pct">34%</div>
              <div className="big-pct-lbl">of sessions happen after midnight, when no traditional services are available.</div>
            </div>
            <div className="stat-card sc-indigo">
              <span className="stat-icon">🪄</span>
              <h3>No stigma. Completely anonymous.</h3>
              <div className="stat-desc">When talking to AI, people are not afraid of being judged and address their problems earlier.</div>
              <div className="big-pct">21%</div>
              <div className="big-pct-lbl">of users said they would not have anyone to talk to except AI.</div>
            </div>
            <div className="stat-card sc-green">
              <span className="stat-icon">🛡️</span>
              <h3>Safe</h3>
              <div className="stat-desc">AI detects when a person needs something more than a chatbot and redirects them to appropriate resources, such as a therapist or hotlines.</div>
            </div>
          </div>
        </div>

        <div className="section-full">
          <div style={{maxWidth: '1100px', margin: '0 auto'}}>
            <div className="why-header">
              <div className="why-icon">🤩</div>
              <h2 style={{color: 'var(--teal)', fontSize: '28px', fontWeight: '700'}}> Why Lumina chat?</h2>
              <p>Our AI Chatbot offers personalized support in motivation, fitness, mental health, mindfulness, and emotional well-being, helping you reach your goals and improve your life.</p>
            </div>
            <div className="why-grid">
              <div className="wcard">
                <span className="wcard-icon">🔒</span>
                <h4>Privacy & Security</h4>
                <p>Your privacy is our priority. Our AI chatbot uses advanced security measures to protect your data.</p>
              </div>
              <div className="wcard">
                <span className="wcard-icon">👤</span>
                <h4>Tailored to You</h4>
                <p>Lumina AI adapts to your unique style and goals, delivering conversations that feel personal, relevant, and supportive — always with your privacy protected.</p>
              </div>
              <div className="wcard">
                <span className="wcard-icon">🎁</span>
                <h4>Premium Experience</h4>
                <p>Enjoy unlimited, high-quality conversations designed for insight, creativity, and growth — all with complete peace of mind. No ads. No data selling.</p>
              </div>
              <div className="wcard">
                <span className="wcard-icon">🙌</span>
                <h4>Instant Responses</h4>
                <p>Our chatbot provides real-time responses, saving you time and ensuring efficiency.</p>
              </div>
              <div className="wcard">
                <span className="wcard-icon">😊</span>
                <h4>User-Friendly Interface</h4>
                <p>Our chatbot is intuitive and easy to use. Communicate effortlessly.</p>
              </div>
              <div className="wcard">
                <span className="wcard-icon">💻</span>
                <h4>Cross-Platform</h4>
                <p>Access via desktop or mobile. Enjoy uninterrupted communication across multiple platforms.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="feedback-section" style={{paddingTop: '56px'}}>
          <div className="feedback-card">
            <div>
              <div className="fc-icon">🌱</div>
              <h3>Help MindEase grow</h3>
              <p>Your experience matters. Share feedback on any feature — every word helps us build a more caring and effective mental health companion for everyone.</p>
            </div>
            <button className="btn-feedback-share" onClick={() => currentUser ? navigate('/feedback') : navigate('/login')}>Share Your Feedback →</button>
          </div>
        </div>

        <div className="cta-section">
          <h2>Ready to Transform Your Mental Well-being?</h2>
          <p>Experience the power of emotion-aware AI. Join thousands who have already found a safe space to talk, reflect, and grow.</p>
          <button className="btn-cta" onClick={() => currentUser ? handleSelectCompanion('companion') : navigate('/login')}>Continue Your Journey</button>
        </div>
      </div>

      <div className="float-notif">🔔</div>
      <button className="float-mode">☀️ Light Mode</button>

      {/* Smart Mode Modal */}
      <SmartModeModal 
        isOpen={isSmartModalOpen} 
        onClose={() => setIsSmartModalOpen(false)} 
      />
    </div>
  );
};

export default LandingPage;