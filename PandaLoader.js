import React from 'react';
import './PandaLoader.css';

const PandaLoader = () => {
    return (
        <div className="loader-container">
            <div className="panda-loader">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    {/* Ears */}
                    <circle cx="20" cy="20" r="15" fill="#111" />
                    <circle cx="80" cy="20" r="15" fill="#111" />

                    {/* Head */}
                    <circle cx="50" cy="50" r="45" fill="#fff" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#111" strokeWidth="5" />

                    {/* Eyes patches */}
                    <ellipse cx="30" cy="50" rx="15" ry="20" fill="#111" transform="rotate(-15 30 50)" />
                    <ellipse cx="70" cy="50" rx="15" ry="20" fill="#111" transform="rotate(15 70 50)" />

                    {/* Eyes inner whites */}
                    <circle cx="32" cy="45" r="5" fill="#fff" className="eye-sparkle" />
                    <circle cx="68" cy="45" r="5" fill="#fff" className="eye-sparkle" />
                    <circle cx="28" cy="52" r="2" fill="#fff" className="eye-sparkle-small" />
                    <circle cx="72" cy="52" r="2" fill="#fff" className="eye-sparkle-small" />

                    {/* Nose */}
                    <ellipse cx="50" cy="65" rx="8" ry="5" fill="#111" />

                    {/* Mouth */}
                    <path d="M 40 75 Q 50 85 60 75" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" />

                    {/* Blushing cheeks */}
                    <ellipse cx="20" cy="65" rx="6" ry="4" fill="rgba(255, 105, 180, 0.5)" />
                    <ellipse cx="80" cy="65" rx="6" ry="4" fill="rgba(255, 105, 180, 0.5)" />
                </svg>
            </div>
            <h3 className="loader-text">Waking up Lumina...</h3>
        </div>
    );
};

export default PandaLoader;
