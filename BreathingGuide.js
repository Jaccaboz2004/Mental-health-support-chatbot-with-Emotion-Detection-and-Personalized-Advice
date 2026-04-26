import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/BreathingGuide.css';

const PATS = {
  '478': {
    title: '4 · 7 · 8 Relaxation',
    phases: [
      { lbl: 'inhale', sub: 'Breathe in deeply',  dur: 4,  r: 92, col: '#7F77DD', gc: ['#7F77DD','#AFA9EC','#534AB7'] },
      { lbl: 'hold',   sub: 'Hold gently',         dur: 7,  r: 92, col: '#AFA9EC', gc: ['#AFA9EC','#7F77DD','#534AB7'] },
      { lbl: 'exhale', sub: 'Release fully',       dur: 8,  r: 56, col: '#1D9E75', gc: ['#1D9E75','#5DCAA5','#0F6E56'] }
    ]
  },
  'box': {
    title: 'Box Breathing',
    phases: [
      { lbl: 'inhale', sub: 'Breathe in',    dur: 4, r: 92, col: '#7F77DD', gc: ['#7F77DD','#AFA9EC','#534AB7'] },
      { lbl: 'hold',   sub: 'Hold',           dur: 4, r: 92, col: '#1D9E75', gc: ['#1D9E75','#5DCAA5','#0F6E56'] },
      { lbl: 'exhale', sub: 'Breathe out',    dur: 4, r: 56, col: '#D85A30', gc: ['#D85A30','#F0997B','#993C1D'] },
      { lbl: 'hold',   sub: 'Hold empty',     dur: 4, r: 56, col: '#AFA9EC', gc: ['#AFA9EC','#7F77DD','#534AB7'] }
    ]
  },
  'calm': {
    title: '4 · 4 Calm',
    phases: [
      { lbl: 'inhale', sub: 'Breathe in',    dur: 4, r: 92, col: '#D85A30', gc: ['#D85A30','#F0997B','#EF9F27'] },
      { lbl: 'exhale', sub: 'Breathe out',   dur: 4, r: 56, col: '#7F77DD', gc: ['#7F77DD','#1D9E75','#534AB7'] }
    ]
  }
};

const GOAL = 5;
const CIRCUM = 2 * Math.PI * 114;
const PETAL_COLS = ['#7F77DD','#1D9E75','#D85A30','#AFA9EC','#5DCAA5','#EF9F27','#D4537E'];
const DOT_COLS   = ['#7F77DD','#1D9E75','#D85A30','#AFA9EC','#5DCAA5'];

function buildPetals(phase) {
  return Array.from({ length: 7 }, (_, i) => {
    const angle = (i / 7) * 360;
    const dist  = phase === 'inhale' ? 84 : phase === 'exhale' ? 48 : 64;
    const scales= phase === 'inhale'
      ? [1.45,1.35,1.5,1.3,1.45,1.35,1.5]
      : phase === 'exhale'
        ? [0.65,0.75,0.65,0.8,0.65,0.75,0.65]
        : [1.05,1.0,1.1,1.0,1.05,1.0,1.1];
    const opacity = phase === 'inhale' ? 0.55 : phase === 'exhale' ? 0.18 : 0.35;
    const dur = phase === 'exhale' ? 3.5 : 2.5;
    return { angle, dist, scale: scales[i], opacity, dur, col: PETAL_COLS[i] };
  });
}

const BreathingGuide = () => {
  const [isDark, setIsDark]       = useState(true);
  const [patKey, setPatKey]       = useState('478');
  const [run, setRun]             = useState(false);
  const [pi, setPi]               = useState(0);   // phase index
  const [ps, setPs]               = useState(0);   // seconds elapsed in phase
  const [cyc, setCyc]             = useState(0);
  const [tot, setTot]             = useState(0);
  const [sndOn, setSndOn]         = useState(false);
  const [done, setDone]           = useState(false);
  const [petals, setPetals]       = useState(() => buildPetals('ready'));
  const [arcOffset, setArcOffset] = useState(CIRCUM);
  const [circR, setCircR]         = useState(80);
  const [circCol, setCircCol]     = useState('#7F77DD');
  const [gradCols, setGradCols]   = useState(['#7F77DD','#1D9E75','#D85A30']);
  const [orbCols, setOrbCols]     = useState(['#7F77DD','#1D9E75','#D85A30']);

  const tickRef  = useRef(null);
  const aCtxRef  = useRef(null);
  const piRef    = useRef(pi);
  const psRef    = useRef(ps);
  const cycRef   = useRef(cyc);
  const totRef   = useRef(tot);
  const runRef   = useRef(run);
  const patRef   = useRef(PATS['478']);

  // keep refs in sync
  useEffect(() => { piRef.current  = pi;  }, [pi]);
  useEffect(() => { psRef.current  = ps;  }, [ps]);
  useEffect(() => { cycRef.current = cyc; }, [cyc]);
  useEffect(() => { totRef.current = tot; }, [tot]);
  useEffect(() => { runRef.current = run; }, [run]);
  useEffect(() => { patRef.current = PATS[patKey]; }, [patKey]);

  const tone = useCallback((type) => {
    if (!sndOn) return;
    if (!aCtxRef.current) aCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = aCtxRef.current;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;
    if      (type === 'inhale') { o.frequency.setValueAtTime(396,t); o.frequency.linearRampToValueAtTime(528, t+.7); }
    else if (type === 'exhale') { o.frequency.setValueAtTime(528,t); o.frequency.linearRampToValueAtTime(330, t+.7); }
    else if (type === 'done')   { o.frequency.setValueAtTime(528,t); o.frequency.linearRampToValueAtTime(660, t+.5); }
    else                        { o.frequency.setValueAtTime(462,t); }
    o.type = 'sine';
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.07, t+.1);
    g.gain.linearRampToValueAtTime(0, t+.9);
    o.start(t); o.stop(t+1);
  }, [sndOn]);

  const applyPhase = useCallback((phaseIdx) => {
    const pat = patRef.current;
    const p = pat.phases[phaseIdx % pat.phases.length];
    setArcOffset(CIRCUM);
    setCircR(p.r);
    setCircCol(p.col);
    setGradCols(p.gc);
    setOrbCols(p.gc);
    setPetals(buildPetals(p.lbl));
    return p;
  }, []);

  const doReset = useCallback(() => {
    clearInterval(tickRef.current);
    setRun(false); setPi(0); setPs(0); setCyc(0); setTot(0); setDone(false);
    piRef.current = 0; psRef.current = 0; cycRef.current = 0; totRef.current = 0; runRef.current = false;
    setArcOffset(CIRCUM);
    setCircR(80); setCircCol('#7F77DD');
    setGradCols(['#7F77DD','#1D9E75','#D85A30']);
    setOrbCols(['#7F77DD','#1D9E75','#D85A30']);
    setPetals(buildPetals('ready'));
  }, []);

  // Tick logic
  useEffect(() => {
    if (!run) { clearInterval(tickRef.current); return; }

    const pat = patRef.current;

    // Kick off first phase
    applyPhase(piRef.current);
    tone(pat.phases[piRef.current % pat.phases.length].lbl);

    tickRef.current = setInterval(() => {
      const newTot = totRef.current + 1;
      const newPs  = psRef.current  + 1;
      totRef.current = newTot;
      psRef.current  = newPs;
      setTot(newTot);

      const currentPat   = patRef.current;
      const currentPhase = currentPat.phases[piRef.current % currentPat.phases.length];

      // update arc
      setArcOffset(CIRCUM * (1 - newPs / currentPhase.dur));
      // update countdown
      setPs(newPs);

      if (newPs >= currentPhase.dur) {
        const nextPi = piRef.current + 1;
        if (nextPi >= currentPat.phases.length) {
          // completed a cycle
          const newCyc = cycRef.current + 1;
          cycRef.current = newCyc;
          setCyc(newCyc);
          if (newCyc >= GOAL) {
            clearInterval(tickRef.current);
            setRun(false); runRef.current = false;
            setDone(true);
            setPetals(buildPetals('inhale'));
            tone('done');
            return;
          }
          piRef.current = 0; psRef.current = 0;
          setPi(0); setPs(0);
          applyPhase(0);
          tone(currentPat.phases[0].lbl);
        } else {
          piRef.current = nextPi; psRef.current = 0;
          setPi(nextPi); setPs(0);
          applyPhase(nextPi);
          tone(currentPat.phases[nextPi % currentPat.phases.length].lbl);
        }
      }
    }, 1000);

    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  const togPlay = () => {
    if (done) { doReset(); return; }
    setRun(r => !r);
  };

  const togSnd = () => {
    setSndOn(s => {
      if (!s) {
        if (!aCtxRef.current) aCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        tone('inhale');
      }
      return !s;
    });
  };

  const selPat = (key) => {
    setPatKey(key);
    patRef.current = PATS[key];
    doReset();
  };

  const pat = PATS[patKey];
  const currentP = pat.phases[pi % pat.phases.length];
  const countdown = Math.max(0, currentP.dur - ps);
  const m = Math.floor(tot / 60), s = tot % 60;
  const timeStr = `${m}:${s.toString().padStart(2,'0')}`;
  const pct = Math.min(100, Math.round((cyc / GOAL) * 100));

  let phaseLabel = 'ready';
  let phaseSub   = 'press play to begin';
  let phaseNum   = '—';
  if (done) { phaseLabel = 'complete'; phaseSub = 'Session complete — well done!'; phaseNum = ''; }
  else if (run) { phaseLabel = currentP.lbl; phaseSub = currentP.sub; phaseNum = String(countdown); }

  return (
    <div className={`bg-app ${isDark ? 'dark' : 'light'}`}>
      {/* Background orbs */}
      <div className="bg-orb orb1" style={{ background: orbCols[0] }} />
      <div className="bg-orb orb2" style={{ background: orbCols[1] }} />
      <div className="bg-orb orb3" style={{ background: orbCols[2] }} />

      <div className="mbg-app">
        {/* Topbar */}
        <div className="mbg-topbar">
          <div className="mbg-app-label">Mindful breathing</div>
          <div className="mbg-toggle-wrap">
            <span className="mbg-mode-label">{isDark ? 'Dark' : 'Light'}</span>
            <button className="mbg-toggle" onClick={() => setIsDark(d => !d)} aria-label="Toggle theme">
              <div className="mbg-toggle-knob" style={{ transform: isDark ? 'translateX(23px)' : 'translateX(3px)' }} />
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mbg-header">
          <div className="mbg-eyebrow">Guided session</div>
          <div className="mbg-main-title">{pat.title}</div>
        </div>

        {/* Pattern pills */}
        <div className="mbg-pat-row">
          {[['478','4 · 7 · 8 Relax'],['box','Box Breathing'],['calm','4 · 4 Calm']].map(([k,lbl]) => (
            <button
              key={k}
              className={`mbg-pt ${patKey === k ? 'on' : ''}`}
              data-k={k}
              onClick={() => selPat(k)}
            >{lbl}</button>
          ))}
        </div>

        {/* Stage */}
        <div className="mbg-stage">
          <div className="mbg-ring r1" />
          <div className="mbg-ring r2" />
          <div className="mbg-ring r3" />

          {/* Petals */}
          <div className="mbg-petals">
            {petals.map((p, i) => (
              <div
                key={i}
                className="mbg-petal"
                style={{
                  width: 52, height: 52,
                  background: p.col,
                  marginLeft: -26, marginTop: -26,
                  transform: `rotate(${p.angle}deg) translate(${p.dist}px) rotate(-${p.angle}deg) scale(${p.scale})`,
                  opacity: p.opacity,
                  transition: `all ${p.dur}s cubic-bezier(.4,0,.2,1)`
                }}
              />
            ))}
          </div>

          {/* SVG arc */}
          <svg className="mbg-msv" viewBox="0 0 290 290">
            <defs>
              <linearGradient id="mbg-ag" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor={gradCols[0]} />
                <stop offset="50%"  stopColor={gradCols[1]} />
                <stop offset="100%" stopColor={gradCols[2]} />
              </linearGradient>
            </defs>
            <circle cx="145" cy="145" r={circR}
              fill={circCol + '28'}
              style={{ transition: `r ${currentP.dur}s cubic-bezier(.4,0,.2,1)` }}
            />
            <circle cx="145" cy="145" r={circR}
              fill="none" stroke={circCol} strokeWidth="1.3" opacity=".45"
              style={{ transition: `r ${currentP.dur}s cubic-bezier(.4,0,.2,1)` }}
            />
            <circle cx="145" cy="145" r="114"
              fill="none" stroke="url(#mbg-ag)" strokeWidth="3"
              strokeDasharray={CIRCUM} strokeDashoffset={arcOffset}
              strokeLinecap="round"
              transform="rotate(-90 145 145)" opacity=".9"
              style={{ transition: run ? 'stroke-dashoffset 1s linear' : 'none' }}
            />
          </svg>

          {/* Center text */}
          <div className="mbg-ctr">
            <div className="mbg-ph-tag" style={{ background: circCol }}>{phaseLabel}</div>
            <div className="mbg-ph-num">{phaseNum}</div>
            <div className="mbg-ph-sub">{phaseSub}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="mbg-stats-row">
          <div className="mbg-sc"><div className="mbg-sc-l">Cycle</div><div className="mbg-sc-v">{cyc}</div></div>
          <div className="mbg-sc"><div className="mbg-sc-l">Time</div><div className="mbg-sc-v">{timeStr}</div></div>
          <div className="mbg-sc"><div className="mbg-sc-l">Goal</div><div className="mbg-sc-v">{GOAL}</div></div>
        </div>

        {/* Sound toggle */}
        <div className="mbg-sound-row">
          <button className={`mbg-snd ${sndOn ? 'on' : ''}`} onClick={togSnd}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 5.5h2.5L8 2v12l-3.5-3.5H2v-5z"/>
              <path d="M10.5 5.5a3 3 0 0 1 0 5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity={sndOn ? 1 : 0} style={{ transition:'opacity .3s' }}/>
              <path d="M12.5 3a6 6 0 0 1 0 10" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity={sndOn ? 1 : 0} style={{ transition:'opacity .3s' }}/>
            </svg>
            <span>{sndOn ? 'Sound on' : 'Sound off'}</span>
          </button>
        </div>

        {/* Controls */}
        <div className="mbg-ctrls">
          <button className="mbg-abtn" onClick={doReset} title="Reset">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9L2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button className="mbg-pbtn" onClick={togPlay}>
            {!run || done
              ? <div className="mbg-ply" />
              : <div className="mbg-pau"><i /><i /></div>
            }
          </button>

          <div style={{ width: 44, height: 44 }} />
        </div>

        {/* Progress */}
        <div className="mbg-prog-wrap">
          <div className="mbg-prog-top">
            <span>Session progress</span>
            <span>{cyc} of {GOAL} cycles</span>
          </div>
          <div className="mbg-prog-track">
            <div className="mbg-prog-bar" style={{ width: pct + '%' }} />
          </div>
          <div className="mbg-dot-row">
            {Array.from({ length: GOAL }, (_, i) => (
              <div
                key={i}
                className={`mbg-dot ${i < cyc ? 'done' : (i === cyc && run ? 'cur' : '')}`}
                style={{ background: DOT_COLS[i % 5] + (i < cyc ? '44' : '88') }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreathingGuide;
