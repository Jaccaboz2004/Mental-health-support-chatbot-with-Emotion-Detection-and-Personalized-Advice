import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/xai_dashboard.css';

const XAIDashboard = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem('user_id')) {
      navigate('/login');
      return;
    }

    const fetchConversations = async () => {
      try {
        const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
        const res = await axios.get(`${BACKEND_URL}/api/conversations`);
        setConversations(res.data);
        if (res.data.length > 0) {
          setSelectedConvo(res.data[0]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchConversations();
  }, [navigate]);

  const parseConfidence = (conf) => {
    if (!conf) return 80; // default
    const match = conf.match(/(\d+)/);
    return match ? parseInt(match[1]) : 80;
  };

  return (
    <div className="xai-page fade-in-up">
      <nav className="xai-nav">
        <button onClick={() => navigate('/')} className="back-button">❮ Back to Home</button>
        <h1 className="xai-title">
          <span className="xai-badge">XAI</span> Explainable AI Transparency
        </h1>
        <div style={{ width: '120px' }}></div> {/* Spacer */}
      </nav>

      <div className="xai-layout">
        <div className="xai-sidebar">
          <h3>Interaction Log</h3>
          <p className="sidebar-hint">Select a chat to view AI reasoning</p>
          <div className="xai-list">
            {conversations.map((conv, idx) => (
              <div
                key={idx}
                className={`xai-list-item ${selectedConvo && selectedConvo._id === conv._id ? 'active' : ''}`}
                onClick={() => setSelectedConvo(conv)}
              >
                <div className="xai-list-msg">"{conv.user_message?.substring(0, 40)}{conv.user_message?.length > 40 ? '...' : ''}"</div>
                <div className="xai-list-meta">
                  <span className={`meta-tag emo-${(conv.emotion || 'neutral').toLowerCase()}`}>{conv.emotion}</span>
                  <span className="meta-time">{new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
            {conversations.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1rem' }}>No history found.</p>}
          </div>
        </div>

        <div className="xai-main">
          {selectedConvo ? (
            <div className="xai-breakdown fade-in-up">

              <div className="xai-section">
                <div className="xai-section-title">INPUT</div>
                <div className="xai-input-bubble">
                  "{selectedConvo.user_message}"
                </div>
              </div>

              <div className="xai-pipeline">
                <div className="pipeline-line"></div>

                {/* Step 1: Classification */}
                <div className="xai-node">
                  <div className="node-icon model-icon">🧠</div>
                  <div className="node-content">
                    <h4>Phase 1: Emotion Classification Model</h4>
                    <p>The input text is passed to an AI classifier to map the semantic phrasing to a distinct emotive state.</p>
                    <div className="node-metrics">
                      <div className="metric">
                        <label>Identified Emotion</label>
                        <span className="metric-val">{selectedConvo.emotion || 'Unknown'}</span>
                      </div>
                      <div className="metric" style={{ flex: 1 }}>
                        <label>Model Confidence Score</label>
                        <div className="confidence-bar-container">
                          <div className="confidence-bar" style={{ width: `${parseConfidence(selectedConvo.confidence)}%` }}></div>
                          <span className="confidence-text">{selectedConvo.confidence || '80%'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Context / RAG */}
                <div className="xai-node">
                  <div className="node-icon db-icon">🗄️</div>
                  <div className="node-content">
                    <h4>Phase 2: RAG Context Retrieval</h4>
                    <p>The input is converted to high-dimensional embeddings. The AI searches its vector database for historically relevant therapeutic context to ground the response.</p>
                    <div className="node-metrics">
                      <div className="metric">
                        <label>Context Retrieval Success</label>
                        <span className="metric-val">{selectedConvo.context_used === 'Yes' ? '🟢 Context Injected' : '⚪ Standard Synthesis'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Generation */}
                <div className="xai-node">
                  <div className="node-icon bot-icon">🤖</div>
                  <div className="node-content">
                    <h4>Phase 3: LLM Generation</h4>
                    <p>A generative model drafts the final 3-sentence empathetic response using the configured personality traits.</p>
                    <div className="node-metrics" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div className="metric" style={{ width: '100%', marginBottom: '1rem' }}>
                        <label>System Instructions (Persona)</label>
                        <div className="code-block">{selectedConvo.system_role || `You are an empathetic AI counselor with expert knowledge in psychology. The user is currently feeling ${selectedConvo.emotion}.`}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="xai-section">
                <div className="xai-section-title">OUTPUT</div>
                <div className="xai-output-bubble">
                  {selectedConvo.ai_response}
                </div>
              </div>

            </div>
          ) : (
            <div className="xai-empty">
              <span style={{ fontSize: '3rem' }}>📊</span>
              <p>Your AI reasoning insights will appear here once you select a log from the sidebar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default XAIDashboard;
