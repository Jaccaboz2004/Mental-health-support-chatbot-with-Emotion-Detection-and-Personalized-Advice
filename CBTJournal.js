import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/cbt_journal.css';

const CBTJournal = () => {
  const navigate = useNavigate();
  const [thought, setThought] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem('user_id')) {
      navigate('/login');
    }
  }, [navigate]);

  const handleAnalyze = async () => {
    if (!thought.trim()) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
      const response = await axios.post(`${BACKEND_URL}/api/cbt-reframe`, { thought });
      setResult(response.data);
    } catch (error) {
      console.error("CBT analysis error:", error);
      setResult({
        distortions: ["Error"],
        reframe: "There was a problem processing your thought. Please ensure the server is running."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="cbt-page fade-in-up">
      <nav className="cbt-nav">
        <button onClick={() => navigate('/')} className="back-button">❮ Back to Home</button>
        <h1 className="cbt-title">
          <span className="cbt-icon">💡</span> CBT Thought Diary
        </h1>
        <div style={{ width: '120px' }}></div>
      </nav>

      <div className="cbt-content">
        <div className="cbt-header-text">
          <h2>Reframe Your Thoughts</h2>
          <p>Cognitive Behavioral Therapy (CBT) helps identify negative automatic thoughts and cognitive distortions. Enter something that's bothering you below to get an objective perspective.</p>
        </div>

        <div className="cbt-workspace">
          <div className="cbt-input-section">
            <label className="cbt-label">Your Automatic Thought:</label>
            <textarea
              className="cbt-textarea"
              placeholder="e.g. 'I didn't get a reply yet. They must be angry at me and I'm going to lose this friendship...'"
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              rows="5"
            ></textarea>

            <button
              className={`cbt-analyze-btn ${isAnalyzing ? 'pulsing' : ''}`}
              onClick={handleAnalyze}
              disabled={isAnalyzing || !thought.trim()}
            >
              {isAnalyzing ? 'Analyzing Distortions...' : 'Analyze Thought ❯'}
            </button>
          </div>

          {result && (
            <div className="cbt-result-section fade-in-up">
              <div className="cbt-card distortion-card">
                <div className="card-header">
                  <span className="card-emoji">🔍</span>
                  <h3>Cognitive Distortions Identified</h3>
                </div>
                <div className="distortion-tags">
                  {result.distortions.map((dist, idx) => (
                    <span key={idx} className="distortion-tag">{dist}</span>
                  ))}
                </div>
              </div>

              <div className="cbt-card reframe-card">
                <div className="card-header">
                  <span className="card-emoji">✨</span>
                  <h3>Rational Reframe</h3>
                </div>
                <p className="reframe-text">{result.reframe}</p>
              </div>

              <button className="cbt-reset-btn" onClick={() => { setThought(''); setResult(null); }}>
                Start a New Entry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CBTJournal;
