import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/LoginPage.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
const API = `${BACKEND_URL}/api`;

const colors = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#cc5de8','#ff922b','#f06595'];

const LoginPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const wrapRef = useRef(null);

    useEffect(() => {
        // Generate confetti on mount
        if (!wrapRef.current) return;
        const wrap = wrapRef.current;
        const confettis = [];
        for(let i = 0; i < 18; i++) {
            const c = document.createElement('div');
            c.className = 'confetti-piece';
            c.style.left = Math.random() * 100 + '%';
            c.style.top = '-20px';
            c.style.background = colors[Math.floor(Math.random() * colors.length)];
            c.style.animationDuration = (4 + Math.random() * 6) + 's';
            c.style.animationDelay = (Math.random() * 5) + 's';
            c.style.width = (6 + Math.random() * 8) + 'px';
            c.style.height = (6 + Math.random() * 8) + 'px';
            c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            wrap.appendChild(c);
            confettis.push(c);
        }
        return () => {
            confettis.forEach(c => {
                if(wrapRef.current && wrapRef.current.contains(c)) {
                    wrapRef.current.removeChild(c);
                }
            });
        }
    }, []);

    const triggerClickAnimation = () => {
        if (!wrapRef.current) return;
        const wrap = wrapRef.current;
        for(let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.style.cssText = `position:absolute;width:10px;height:10px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:50%;pointer-events:none;z-index:99;left:50%;top:50%;`;
            wrap.appendChild(p);
            const angle = Math.random() * 360;
            const dist = 80 + Math.random() * 120;
            const dx = Math.cos(angle * Math.PI/180) * dist;
            const dy = Math.sin(angle * Math.PI/180) * dist;
            p.animate([
                {transform:'translate(-50%,-50%) scale(1)',opacity:1},
                {transform:`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`,opacity:0}
            ], {duration: 700 + Math.random()*400, easing:'ease-out', fill:'forwards'}).onfinish = () => p.remove();
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        triggerClickAnimation();

        try {
            const endpoint = isLogin ? '/login' : '/signup';
            const response = await axios.post(`${API}${endpoint}`, {
                username,
                password
            });

            if (response.data.status === 'success') {
                localStorage.setItem('user_id', response.data.username);
                localStorage.setItem('token', response.data.token);
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="wrap" ref={wrapRef}>
            <div className="stars">
                <span></span><span></span><span></span><span></span><span></span><span></span>
            </div>

            <div className="bubble b1"></div>
            <div className="bubble b2"></div>
            <div className="bubble b3"></div>
            <div className="bubble b4"></div>
            <div className="bubble b5"></div>
            <div className="bubble b6"></div>

            <div className="card">
                <div className="left-panel">
                    <div className="sun"></div>

                    <div className="brand-logo">
                        <div className="logo-circle">🌸</div>
                        <span className="brand-text">Lumina</span>
                    </div>

                    <div className="left-middle">
                        <span className="big-emoji">🌈</span>
                        <p className="left-title">You deserve to feel amazing today!</p>
                        <p className="left-sub">A warm, joyful space for your mental wellness journey. Talk, breathe, and grow — one day at a time.</p>
                    </div>

                    <div className="pill-row">
                        <div className="pill"><div className="pill-dot"></div> 24/7 happy support</div>
                        <div className="pill"><div className="pill-dot"></div> Private & safe space</div>
                        <div className="pill"><div className="pill-dot"></div> Guided mood boosts</div>
                    </div>
                </div>

                <div className="right-panel">
                    <div className="hello-tag">✨ {isLogin ? 'Welcome back!' : 'Join us!'}</div>
                    <h1 className="page-title">{isLogin ? "So glad you're here!" : "Let's get started!"}</h1>
                    <p className="page-sub">{isLogin ? "Sign in and let's brighten your day together." : "Sign up and begin your wellness journey."}</p>

                    {error && <div style={{ color: '#e74c3c', marginBottom: '1rem', fontSize: '14px', fontWeight: 'bold' }}>{error}</div>}

                    <form onSubmit={handleSubmit} style={{width: '100%'}}>
                        <div className="fgroup">
                            <label className="flabel">Username</label>
                            <input className="finput" type="text" placeholder="Your amazing username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        </div>

                        <div className="fgroup">
                            <label className="flabel">Password</label>
                            <input className="finput" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>

                        {isLogin && (
                            <div className="row-mid">
                                <label className="rem-label">
                                    <input type="checkbox" /> Remember me
                                </label>
                                <a href="#" className="forgot-link" onClick={(e) => e.preventDefault()}>Forgot password?</a>
                            </div>
                        )}

                        <button className="btn-main" type="submit" disabled={loading}>
                            <span>{loading ? 'Processing...' : (isLogin ? '✨ Sign in & feel great!' : '✨ Sign up & feel great!')}</span>
                        </button>
                    </form>

                    <p className="signup-text">
                        {isLogin ? "New here? " : "Already have an account? "}
                        <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); setError(''); }}>
                            {isLogin ? "Join the joy!" : "Sign in here!"}
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
