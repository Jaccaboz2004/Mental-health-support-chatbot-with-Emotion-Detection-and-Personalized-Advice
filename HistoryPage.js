import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/HistoryPage.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
const API = `${BACKEND_URL}/api`;

const getEmotionColor = (emotion) => {
  const e = emotion?.toLowerCase() || '';
  if (e.includes('joy') || e.includes('happ') || e.includes('excit')) return '#4ade80'; // Green
  if (e.includes('sad') || e.includes('low') || e.includes('depress') || e.includes('grief')) return '#60a5fa'; // Blue
  if (e.includes('ang') || e.includes('frustrat') || e.includes('irrit')) return '#f87171'; // Red
  if (e.includes('fear') || e.includes('anx') || e.includes('nerv') || e.includes('worr')) return '#fbbf24'; // Yellow
  if (e.includes('love') || e.includes('car') || e.includes('compassion')) return '#f472b6'; // Pink
  if (e.includes('surpris') || e.includes('shock')) return '#a78bfa'; // Purple
  if (e.includes('neutral') || e.includes('calm') || e.includes('balanc') || e.includes('peace')) return '#94a3b8'; // Slate
  return '#cbd5e1'; // Default
};

const getEmotionEmoji = (emotion) => {
  const e = emotion?.toLowerCase() || '';
  if (e.includes('joy') || e.includes('happ') || e.includes('excit')) return '😊';
  if (e.includes('sad') || e.includes('low') || e.includes('depress') || e.includes('grief')) return '😢';
  if (e.includes('ang') || e.includes('frustrat') || e.includes('irrit')) return '😡';
  if (e.includes('fear') || e.includes('anx') || e.includes('nerv') || e.includes('worr')) return '😰';
  if (e.includes('love') || e.includes('car') || e.includes('compassion')) return '❤️';
  if (e.includes('surpris') || e.includes('shock')) return '😲';
  if (e.includes('neutral') || e.includes('calm') || e.includes('balanc') || e.includes('peace')) return '😌';
  if (e.includes('overwhelm') || e.includes('stress')) return '🤯';
  if (e.includes('hopeless') || e.includes('despair')) return '😔';
  return '🤖';
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem('user_id') || "anonymous";

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API}/conversations`, { params: { user_id: userId } });
        setConversations(response.data);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [userId]);

  // Aggregate emotions for tracking
  const emotionCounts = conversations.reduce((acc, conv) => {
    const emotion = conv.emotion || 'Unknown';
    acc[emotion] = (acc[emotion] || 0) + 1;
    return acc;
  }, {});

  const totalInteractions = conversations.length;
  
  return (
    <div className="history-container">
      <nav className="history-nav">
        <h2>Your Journey & Progress</h2>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </nav>

      <div className="history-content">
        <div className="dashboard-grid">
          {/* Progress Tracking Widget */}
          <div className="history-card tracking-card">
            <h3>Progress Tracking</h3>
            <div className="tracking-stats">
              <div className="stat-box">
                <span className="stat-value">{totalInteractions}</span>
                <span className="stat-label">Total Reflections</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{Object.keys(emotionCounts).length}</span>
                <span className="stat-label">Emotions Identified</span>
              </div>
            </div>
            <p className="tracking-text">
              Continuously engaging with your thoughts builds awareness and resilience. You're doing great!
            </p>
          </div>

          {/* Mood History Widget */}
          <div className="history-card mood-card">
            <h3>Mood History</h3>
            {totalInteractions === 0 ? (
              <p>No mood data yet. Start chatting to build your history!</p>
            ) : (
              <div className="mood-bars list-style">
                {Object.entries(emotionCounts).map(([emotion, count]) => {
                  const percentage = ((count / totalInteractions) * 100).toFixed(1);
                  return (
                    <div key={emotion} className="mood-bar-container">
                      <div className="mood-bar-info">
                        <span>{getEmotionEmoji(emotion)} {emotion}</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="mood-bar-bg">
                        <div 
                          className="mood-bar-fill" 
                          style={{ 
                            width: `${percentage}%`, 
                            backgroundColor: getEmotionColor(emotion) 
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat History List */}
        <div className="history-card chat-history-card">
          <h3>Chat History</h3>
          {loading ? (
            <p className="loading-text">Loading your past conversations...</p>
          ) : conversations.length === 0 ? (
            <p className="empty-text">Your conversation history is empty.</p>
          ) : (
            <div className="conversation-list">
              {conversations.map((conv) => (
                <div key={conv._id || conv.timestamp} className="conversation-item">
                  <div className="conversation-header">
                    <span className="conv-date">
                      {new Date(conv.timestamp).toLocaleString()}
                    </span>
                    <span className="conv-emotion">
                      {getEmotionEmoji(conv.emotion)} {conv.emotion}
                    </span>
                  </div>
                  <div className="conversation-body">
                    <div className="user-msg">
                      <strong>You:</strong> {conv.user_message}
                    </div>
                    <div className="ai-msg">
                      <strong>AI ({conv.companion || 'Companion'}):</strong> {conv.ai_response}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
