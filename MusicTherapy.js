import React, { useState, useEffect } from 'react';
import '../styles/MusicTherapy.css';

const categories = [
  {
    title: '🌿 Relax & Stress Relief',
    color: '#10b981', // green
    items: [
      { name: 'Soft Piano', icon: '🎹', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZqd5JICZI0u' },
      { name: 'Nature Sounds', icon: '🍃', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4PP3K4eg0Eq' },
      { name: 'Rain Sounds', icon: '🌧', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXbcPC6VvquOE' }
    ]
  },
  {
    title: '😴 Sleep Music',
    color: '#8b5cf6', // purple
    items: [
      { name: 'Slow Ambient', icon: '🌌', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWYcDQ1hSjOpY' },
      { name: 'White Noise', icon: '〰', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZwtERXCS82H' }
    ]
  },
  {
    title: '🧘 Meditation Music',
    color: '#3b82f6', // blue
    items: [
      { name: 'Deep Breathing', icon: '🌬', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZq91oG2NwN6' },
      { name: 'Calm Instrumental', icon: '🎶', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO35pBba' }
    ]
  },
  {
    title: '📚 Focus Music',
    color: '#f59e0b', // orange/amber
    items: [
      { name: 'Lo-Fi Beats', icon: '🎧', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn' },
      { name: 'Study Instrumental', icon: '🎸', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS' }
    ]
  }
];

const MusicTherapy = () => {
  const [activeUrl, setActiveUrl] = useState(null);
  const [breathingPhase, setBreathingPhase] = useState('Inhale'); // 'Inhale', 'Hold', 'Exhale'

  // Breathing animation logic (4-7-8 method simplified to 4 in, 4 out for visual)
  useEffect(() => {
    // A simple rhythmic cycle
    const interval = setInterval(() => {
      setBreathingPhase((prev) => prev === 'Inhale' ? 'Exhale' : 'Inhale');
    }, 4000); // 4 seconds inhale, 4 seconds exhale
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="music-therapy-container">
      <header className="music-header fade-in-down">
        <h1>🎵 Healing Sound Studio</h1>
        <p>Discover the emotional power of sound. Choose a category below.</p>
      </header>

      {/* Main Grid containing Breathing and Music */}
      <div className="music-main-content">
        
        {/* Breathing Sync Widget */}
        <div className="breathing-widget fade-in-up">
          <h3>Sync Your Breath</h3>
          <p>Breathe with the circle and let the music soothe your nervous system.</p>
          <div className="breathing-circle-container">
            <div className={`breathing-circle ${breathingPhase.toLowerCase()}`}>
              <span className="breathing-text">{breathingPhase} 🌬</span>
            </div>
          </div>
        </div>

        {/* Music Categories Grid */}
        <div className="categories-grid fade-in-up" style={{ animationDelay: '0.2s' }}>
          {categories.map((cat, idx) => (
            <div key={idx} className="category-section">
              <h2 style={{ color: cat.color }}>{cat.title}</h2>
              <div className="cards-row">
                {cat.items.map((item, i) => (
                  <div 
                    key={i} 
                    className={`music-card ${activeUrl === item.url ? 'active' : ''}`}
                    onClick={() => setActiveUrl(item.url)}
                    style={{ '--hover-color': cat.color }}
                  >
                    <div className="music-icon">{item.icon}</div>
                    <div className="music-name">{item.name}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Persistent Audio Player at bottom if selected */}
      {activeUrl && (
        <div className="persistent-player fade-in-up">
          <button className="close-player-btn" onClick={() => setActiveUrl(null)}>✖</button>
          <iframe 
            src={`${activeUrl}?utm_source=generator&theme=0`} 
            width="100%" 
            height="152" 
            frameBorder="0" 
            allowFullScreen="" 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
            loading="lazy"
            style={{ borderRadius: '12px' }}
          ></iframe>
        </div>
      )}
    </div>
  );
};

export default MusicTherapy;
