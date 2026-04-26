import React from 'react';
import '../styles/SmartModeWidget.css';

const getEmotionEmoji = (emotion) => {
  const map = { happy: '😊', sad: '😢', angry: '😡', fearful: '😰', neutral: '😌', surprised: '😲', disgusted: '🤢' };
  return map[emotion?.toLowerCase()] || '😌';
};

const SmartModeWidget = ({
  isActive, onClose,
  isModelLoaded, emotion, error, videoRef,
  captureCountdown, isCapturing, isComplete,
  autoGreetSent,
}) => {
  if (!isActive) return null;

  return (
    <div className="smart-widget-container slideLeft">
      <div className="smart-widget-header">
        <span className="smart-widget-title">Smart Mode <span className="sparkle">✨</span></span>
        <button className="smart-widget-close" onClick={onClose} title="Turn off Smart Mode">×</button>
      </div>

      <div className="smart-widget-body">
        {error ? (
          <div className="smart-widget-error">{error}</div>
        ) : (
          <>
            {/* Camera preview — hidden once detection is done */}
            {!isComplete && (
              <div className="video-container">
                <video ref={videoRef} className="smart-widget-video" autoPlay muted playsInline />
                {!isModelLoaded && <div className="video-loading-overlay">Loading…</div>}

                {/* Countdown ring */}
                {captureCountdown !== null && (
                  <div className="smart-countdown-overlay">
                    <div className="smart-countdown-ring">
                      <span className="smart-countdown-number">{captureCountdown}</span>
                    </div>
                    <p className="smart-countdown-label">Hold still…</p>
                  </div>
                )}

                {/* Analysing flash */}
                {isCapturing && <div className="widget-capture-flash" />}
              </div>
            )}

            {/* Status text */}
            <div className="emotion-display" style={{ flexDirection: 'column', gap: 4 }}>
              {isComplete && emotion ? (
                <>
                  <span className="emotion-emoji">{getEmotionEmoji(emotion)}</span>
                  <span className="emotion-label" style={{ color: '#22c55e' }}>{emotion}</span>
                </>
              ) : isCapturing ? (
                <span className="emotion-label" style={{ fontSize: 11 }}>🔍 Analysing…</span>
              ) : captureCountdown !== null ? (
                <span className="emotion-label" style={{ fontSize: 11 }}>📸 Capturing in {captureCountdown}s</span>
              ) : (
                <span className="emotion-label" style={{ fontSize: 11 }}>Camera starting…</span>
              )}
            </div>

            {/* Chat started badge */}
            {autoGreetSent && (
              <div className="smart-chat-started-badge">✅ Chat Started!</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SmartModeWidget;
