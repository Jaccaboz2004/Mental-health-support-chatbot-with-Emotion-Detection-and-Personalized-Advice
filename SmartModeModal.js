import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFaceEmotion } from '../hooks/useFaceEmotion';
import '../styles/SmartModeModal.css';

const SmartModeModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [smartModeActive, setSmartModeActive] = useState(false);
  const [detectionStarted, setDetectionStarted] = useState(false);
  const [emotionCount, setEmotionCount] = useState({ happy: 0, sad: 0, angry: 0, fearful: 0, neutral: 0 });

  const { isModelLoaded, emotion, error, videoRef, captureCountdown, isCapturing, isComplete } = useFaceEmotion(smartModeActive);

  // Map face-api expressions to our companion IDs
  const emotionToCompanion = {
    happy: 'wellness',
    sad: 'friend',
    angry: 'anxiety',
    fearful: 'crisis',
    neutral: 'companion',
    surprised: 'companion',
    disgusted: 'anxiety',
  };

  // Human-readable labels for each companion
  const companionLabels = {
    wellness: 'Wellness Mentor 🌅',
    friend:   'Caring Friend 🫂',
    anxiety:  'Calm Coach 🌊',
    crisis:   'Crisis Specialist ❤️‍🩹',
    companion:'General Companion 🤖',
  };

  // Emotion description shown in the result badge
  const emotionDescriptions = {
    happy:     'You seem happy! Routing to your Wellness Mentor.',
    sad:       'You seem sad. Your Caring Friend is ready for you.',
    neutral:   'You seem calm. Starting your session now.',
    angry:     'You seem stressed. Your Calm Coach will help.',
    fearful:   'You seem anxious. Your Crisis Specialist is here.',
    surprised: 'You seem surprised. Starting your session now.',
    disgusted: 'You seem uncomfortable. Your Calm Coach is ready.',
  };

  // Once snapshot detection is complete, navigate to chat after a brief pause
  useEffect(() => {
    if (!smartModeActive || !isComplete) return;

    const finalEmotion = emotion || 'neutral';
    const companionType = emotionToCompanion[finalEmotion] || 'companion';

    // 2.5s so user reads the detected emotion + companion name before navigating
    const timer = setTimeout(() => {
      setSmartModeActive(false);
      onClose();
      navigate('/chat', { state: { type: companionType, detectedEmotion: finalEmotion, smartMode: true } });
    }, 2500);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, smartModeActive]);

  if (!isOpen) return null;

  const handleNormalMode = () => {
    setSmartModeActive(false);
    onClose();
    navigate('/chat', { state: { type: 'companion' } }); // default
  };

  const handleSmartMode = () => {
    setSmartModeActive(true);
  };

  return (
    <div className="modal-overlay fadeIn">
      <div className="smart-modal-container slideUp">
        <button className="close-btn" onClick={onClose}>×</button>
        
        <div className="modal-header">
           <span className="sparkle-icon">✨</span>
           <h2 className="modal-title">Lumina Smart Mode</h2>
        </div>

        {!smartModeActive ? (
          <div className="modal-content">
            <p className="privacy-text">
              We can personalize your experience using optional facial emotion detection.<br/>
              <strong>Your privacy is respected: we process locally and never store any images.</strong>
            </p>
            
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleSmartMode}>
                Continue with Smart Mode (Recommended)
              </button>
              <button className="btn-secondary" onClick={handleNormalMode}>
                Continue without Camera
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-content detecting-state">
             {error ? (
                <div className="error-message">
                  <p>{error}</p>
                  <button className="btn-secondary mt-3" onClick={handleNormalMode}>
                    Continue Normally
                  </button>
                </div>
             ) : (
                <>
                  <p className="detecting-text">
                    {!isModelLoaded
                      ? '⏳ Loading AI engine…'
                      : isComplete
                      ? `✅ Detected: ${emotion || 'neutral'}`
                      : isCapturing
                      ? '🔍 Analyzing your expression…'
                      : captureCountdown !== null
                      ? `📸 Hold still… capturing in ${captureCountdown}s`
                      : 'Camera starting…'}
                  </p>

                  {/* Live camera preview */}
                  <div className="camera-preview-wrapper">
                    <video ref={videoRef} autoPlay muted playsInline className="small-video-preview" />

                    {/* Countdown ring over the video */}
                    {captureCountdown !== null && (
                      <div className="snapshot-countdown-ring">
                        {captureCountdown}
                      </div>
                    )}

                    {/* Flash overlay when capturing */}
                    {isCapturing && <div className="snapshot-flash" />}
                  </div>

                  {/* Result badge */}
                  {isComplete && emotion && (
                    <div className="snapshot-result-badge">
                      {emotion === 'happy'    && '😊'}
                      {emotion === 'sad'      && '😢'}
                      {emotion === 'neutral'  && '😌'}
                      {emotion === 'angry'    && '😡'}
                      {emotion === 'fearful'  && '😰'}
                      {emotion === 'surprised'&& '😲'}
                      {emotion === 'disgusted'&& '🤢'}
                      <span style={{ marginLeft: 8, textTransform: 'capitalize', fontWeight: 'bold' }}>{emotion}</span>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
                        {emotionDescriptions[emotion] || 'Starting your session…'}
                      </div>
                      <div style={{ marginTop: '0.4rem', fontSize: '0.80rem', color: '#38bdf8', fontWeight: 600 }}>
                        → {companionLabels[emotionToCompanion[emotion] || 'companion']}
                      </div>
                      <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                        🚀 Session starting in a moment…
                      </div>
                    </div>
                  )}
                </>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartModeModal;
