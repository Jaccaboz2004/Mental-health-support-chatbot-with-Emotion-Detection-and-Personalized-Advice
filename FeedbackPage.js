import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/* ─── Google Fonts injection (matches the HTML) ──────── */
if (!document.getElementById("fb-font-link")) {
  const link = document.createElement("link");
  link.id = "fb-font-link";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap";
  document.head.appendChild(link);
}

const FEATURES = [
  { id: "c1", value: "CBT Thought Diary", label: "CBT Thought Diary" },
  { id: "c2", value: "Daily Journal",     label: "Daily Journal" },
  { id: "c3", value: "Breathing Guide",   label: "Breathing Guide" },
  { id: "c4", value: "Daily Tasks",       label: "Daily Tasks" },
  { id: "c5", value: "Music Therapy",     label: "Music Therapy" },
];


const FEEDBACK_TYPES = [
  "Suggestion",
  "Bug Report",
  "Compliment",
  "Complaint",
  "Question",
];

/* ─── All CSS as a single injected <style> block ─────── */
const CSS = `
  .fb-root *,
  .fb-root *::before,
  .fb-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .fb-root {
    --fb-bg:        #f5f0eb;
    --fb-surface:   #fffdf9;
    --fb-sage:      #7a9e87;
    --fb-sage-deep: #4f7a63;
    --fb-blush:     #e8b4a0;
    --fb-text:      #2c2825;
    --fb-muted:     #8a8078;
    --fb-border:    #e0d8d0;
    --fb-shadow:    rgba(100,80,60,0.10);
    background: var(--fb-bg) !important;
    font-family: 'DM Sans', sans-serif !important;
    color: var(--fb-text) !important;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 16px;
    position: relative;
    overflow-x: hidden;
  }

  /* Ambient blobs */
  .fb-blob-tl {
    position: fixed; top: -120px; left: -120px;
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(122,158,135,0.18) 0%, transparent 70%);
    border-radius: 50%; pointer-events: none; z-index: 0;
  }
  .fb-blob-br {
    position: fixed; bottom: -140px; right: -100px;
    width: 450px; height: 450px;
    background: radial-gradient(circle, rgba(232,180,160,0.20) 0%, transparent 70%);
    border-radius: 50%; pointer-events: none; z-index: 0;
  }

  /* Card */
  .fb-card {
    background: var(--fb-surface);
    border-radius: 28px;
    padding: 56px 52px;
    max-width: 620px;
    width: 100%;
    box-shadow: 0 8px 48px var(--fb-shadow), 0 1px 0 rgba(255,255,255,0.9) inset;
    position: relative;
    z-index: 1;
    animation: fbFadeUp2 0.7s ease both;
  }
  @keyframes fbFadeUp2 {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Leaf */
  .fb-leaf {
    display: block; margin: 0 auto 28px;
    width: 52px; height: 52px;
  }

  /* Title */
  .fb-card h1 {
    font-family: 'Lora', serif !important;
    font-size: 2rem; font-weight: 600;
    text-align: center; color: var(--fb-text) !important;
    line-height: 1.25; margin-bottom: 6px;
  }

  .fb-subtitle {
    text-align: center; color: var(--fb-muted) !important;
    font-size: 0.95rem; font-weight: 300;
    margin-bottom: 38px; line-height: 1.6;
  }

  /* Divider */
  .fb-divider {
    display: flex; align-items: center; gap: 12px; margin-bottom: 38px;
  }
  .fb-divider::before, .fb-divider::after {
    content: ''; flex: 1; height: 1px; background: var(--fb-border);
  }
  .fb-divider span {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--fb-sage); display: block;
  }

  /* Field */
  .fb-field { margin-bottom: 22px; }
  .fb-field label {
    display: block; font-size: 0.85rem; font-weight: 500;
    color: var(--fb-text) !important; margin-bottom: 8px;
    letter-spacing: 0.02em; font-family: 'DM Sans', sans-serif;
  }
  .fb-field .req { color: var(--fb-blush); margin-left: 3px; }

  .fb-field input[type="text"],
  .fb-field input[type="email"],
  .fb-field select,
  .fb-field textarea {
    width: 100%;
    background: var(--fb-bg) !important;
    border: 1.5px solid var(--fb-border) !important;
    border-radius: 12px;
    padding: 13px 16px;
    font-family: 'DM Sans', sans-serif !important;
    font-size: 0.95rem;
    color: var(--fb-text) !important;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    box-shadow: none !important;
  }
  .fb-field input[type="text"]:focus,
  .fb-field input[type="email"]:focus,
  .fb-field select:focus,
  .fb-field textarea:focus {
    border-color: var(--fb-sage) !important;
    box-shadow: 0 0 0 3px rgba(122,158,135,0.15) !important;
    background: #fff !important;
  }
  .fb-field textarea {
    resize: vertical; min-height: 120px; line-height: 1.6;
  }

  /* select arrow */
  .fb-select-wrap { position: relative; }
  .fb-select-wrap::after {
    content: '▾'; position: absolute; right: 16px; top: 50%;
    transform: translateY(-50%); color: var(--fb-muted);
    pointer-events: none; font-size: 0.9rem;
  }

  /* Error */
  .fb-field--error input,
  .fb-field--error textarea,
  .fb-field--error select {
    border-color: #c0392b !important;
  }
  .fb-err { color: #c0392b; font-size: 0.8rem; margin-top: 5px; }

  /* Stars */
  .fb-stars {
    display: flex; flex-direction: row-reverse;
    justify-content: flex-end; gap: 8px;
  }
  .fb-stars input[type="radio"] { display: none; }
  .fb-stars .fb-star {
    font-size: 2rem; cursor: pointer;
    color: #d8cfc7 !important;
    transition: color 0.15s, transform 0.15s;
    line-height: 1; user-select: none;
  }
  .fb-stars input[type="radio"]:checked ~ .fb-star  { color: #e8a840 !important; }
  .fb-stars .fb-star:hover                           { color: #e8a840 !important; transform: scale(1.15); }
  .fb-stars .fb-star:hover ~ .fb-star               { color: #e8a840 !important; }

  /* Chips */
  .fb-chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
  .fb-chip {
    display: inline-block; padding: 8px 16px;
    border-radius: 999px; border: 1.5px solid var(--fb-border);
    font-size: 0.85rem; font-weight: 400; cursor: pointer;
    background: var(--fb-bg) !important; color: var(--fb-muted) !important;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.18s;
  }
  .fb-chip:hover { border-color: var(--fb-sage); color: var(--fb-sage-deep) !important; }
  .fb-chip--on {
    background: var(--fb-sage) !important;
    border-color: var(--fb-sage); color: #fff !important; font-weight: 500;
  }

  /* Submit */
  .fb-submit {
    width: 100%; padding: 16px;
    background: var(--fb-sage); color: #fff;
    border: none; border-radius: 14px;
    font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 500;
    cursor: pointer; margin-top: 10px; letter-spacing: 0.01em;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 18px rgba(79,122,99,0.25);
  }
  .fb-submit:hover:not(:disabled) {
    background: var(--fb-sage-deep); transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(79,122,99,0.32);
  }
  .fb-submit:active { transform: translateY(0); }
  .fb-submit:disabled { opacity: 0.65; cursor: not-allowed; }

  /* Footer note */
  .fb-footer-note {
    text-align: center; font-size: 0.78rem;
    color: var(--fb-muted) !important; margin-top: 20px; line-height: 1.6;
  }

  /* Server error */
  .fb-server-err {
    background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.25);
    color: #c0392b; border-radius: 10px;
    padding: 12px 16px; font-size: 0.9rem; margin-bottom: 20px;
  }

  /* Success */
  .fb-success {
    display: flex; flex-direction: column;
    align-items: center; text-align: center; padding: 20px 0;
    animation: fbFadeUp2 0.6s ease both;
  }
  .fb-success-icon {
    width: 72px; height: 72px; background: var(--fb-sage);
    border-radius: 50%; display: flex; align-items: center;
    justify-content: center; margin-bottom: 24px; font-size: 2rem; color: #fff;
  }
  .fb-success h2 {
    font-family: 'Lora', serif !important; font-size: 1.6rem;
    color: var(--fb-text) !important; margin-bottom: 12px;
  }
  .fb-success p {
    color: var(--fb-muted) !important; font-size: 0.95rem;
    line-height: 1.7; max-width: 340px; margin-bottom: 28px;
  }
  .fb-back {
    padding: 12px 28px; background: var(--fb-sage); color: #fff;
    border: none; border-radius: 12px;
    font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 500;
    cursor: pointer; transition: background 0.2s, transform 0.15s;
    box-shadow: 0 4px 14px rgba(79,122,99,0.22);
  }
  .fb-back:hover { background: var(--fb-sage-deep); transform: translateY(-1px); }

  @media (max-width: 600px) {
    .fb-card { padding: 36px 24px; }
    .fb-card h1 { font-size: 1.6rem !important; }
  }
`;

export default function FeedbackPage() {
  const navigate = useNavigate();
  const currentUser = localStorage.getItem("user_id");

  useEffect(() => {
    if (!currentUser || currentUser === "anonymous") {
      navigate("/login", { state: { from: "/feedback", message: "Please login to share your feedback." } });
    }
  }, [currentUser, navigate]);

  const [form, setForm] = useState({
    name:        currentUser && currentUser !== "anonymous" ? currentUser : "",
    email:       "",
    rating:      0,
    features:    [],
    feedbackType:"",
    message:     "",
  });
  const [errors,      setErrors]      = useState({});
  const [submitted,   setSubmitted]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [serverError, setServerError] = useState("");

  if (!currentUser || currentUser === "anonymous") return null;

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleFeature = (val) =>
    setForm(f => ({
      ...f,
      features: f.features.includes(val)
        ? f.features.filter(v => v !== val)
        : [...f.features, val],
    }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())                             e.name    = "Please enter your name.";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "Please enter a valid email.";
    if (!form.rating)                                  e.rating  = "Please rate your experience.";
    if (!form.message.trim())                          e.message = "Please write a message.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await axios.post("http://localhost:8000/api/feedback", {
        name:          form.name,
        email:         form.email,
        rating:        form.rating,
        features:      form.features,
        feedback_type: form.feedbackType,
        message:       form.message,
        user_id:       currentUser,
      });
      setSubmitted(true);
    } catch (err) {
      setServerError(err?.response?.data?.detail || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Scoped styles — won't bleed into the rest of the app */}
      <style>{CSS}</style>

      <div className="fb-root">
        {/* Ambient blobs */}
        <div className="fb-blob-tl" />
        <div className="fb-blob-br" />

        <div className="fb-card">

          {/* Leaf SVG */}
          <svg className="fb-leaf" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="26" fill="#eaf3ee"/>
            <path d="M26 38C26 38 14 30.5 14 21.5C14 16.25 19.5 12 26 16C32.5 12 38 16.25 38 21.5C38 30.5 26 38 26 38Z" fill="#7a9e87"/>
            <line x1="26" y1="24" x2="26" y2="38" stroke="#4f7a63" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>

          <h1>How was your experience?</h1>
          <p className="fb-subtitle">
            Your feedback helps Lumina grow into a better<br/>companion for everyone who needs it.
          </p>

          <div className="fb-divider"><span/><span/><span/></div>

          {submitted ? (
            /* ── Success ── */
            <div className="fb-success">
              <div className="fb-success-icon">✓</div>
              <h2>Thank you so much!</h2>
              <p>Your feedback has been received. It means a lot and will help us build a more caring and effective mental health companion for everyone.</p>
              <button className="fb-back" onClick={() => navigate("/")}>← Back to Home</button>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} noValidate>
              {serverError && <div className="fb-server-err">⚠️ {serverError}</div>}

              {/* Name */}
              <div className={`fb-field ${errors.name ? "fb-field--error" : ""}`}>
                <label htmlFor="fb-name">Your Name <span className="req">*</span></label>
                <input id="fb-name" type="text" value={form.name}
                  onChange={e => set("name", e.target.value)} placeholder="e.g. Priya Sharma"/>
                {errors.name && <p className="fb-err">{errors.name}</p>}
              </div>

              {/* Email */}
              <div className={`fb-field ${errors.email ? "fb-field--error" : ""}`}>
                <label htmlFor="fb-email">Email Address <span className="req">*</span></label>
                <input id="fb-email" type="email" value={form.email}
                  onChange={e => set("email", e.target.value)} placeholder="you@example.com"/>
                {errors.email && <p className="fb-err">{errors.email}</p>}
              </div>

              {/* Stars */}
              <div className={`fb-field ${errors.rating ? "fb-field--error" : ""}`}>
                <label>Overall Experience <span className="req">*</span></label>
                <div className="fb-stars" role="group" aria-label="Rating">
                  {[5, 4, 3, 2, 1].map(n => (
                    <React.Fragment key={n}>
                      <input type="radio" name="rating" id={`star-${n}`} value={n}
                        checked={form.rating === n} onChange={() => set("rating", n)}/>
                      <span className="fb-star" title={["","Very Poor","Poor","Okay","Good","Excellent"][n]}
                        onClick={() => set("rating", n)}>★</span>
                    </React.Fragment>
                  ))}
                </div>
                {errors.rating && <p className="fb-err">{errors.rating}</p>}
              </div>

              {/* Feature chips */}
              <div className="fb-field">
                <label>Which feature are you reviewing?</label>
                <div className="fb-chips">
                  {FEATURES.map(f => (
                    <button key={f.id} type="button"
                      className={`fb-chip ${form.features.includes(f.value) ? "fb-chip--on" : ""}`}
                      onClick={() => toggleFeature(f.value)}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div className="fb-field">
                <label htmlFor="fb-type">Type of Feedback</label>
                <div className="fb-select-wrap">
                  <select id="fb-type" value={form.feedbackType}
                    onChange={e => set("feedbackType", e.target.value)}>
                    <option value="">Choose one…</option>
                    {FEEDBACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Message */}
              <div className={`fb-field ${errors.message ? "fb-field--error" : ""}`}>
                <label htmlFor="fb-message">Your Message <span className="req">*</span></label>
                <textarea id="fb-message" value={form.message}
                  onChange={e => set("message", e.target.value)}
                  placeholder="Tell us what's on your mind — every word helps us improve…"/>
                {errors.message && <p className="fb-err">{errors.message}</p>}
              </div>

              <button type="submit" className="fb-submit" disabled={loading}>
                {loading ? "Sending…" : "Send Feedback →"}
              </button>

              <p className="fb-footer-note">Your response is private and never shared with third parties.</p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
