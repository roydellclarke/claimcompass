import React, { useState, useEffect, useLayoutEffect, useCallback, memo, useRef } from 'react';
import axios from 'axios';

// useLayoutEffect logs a warning during SSR; fall back to useEffect on the server.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const AUTH_TOKEN_KEY = 'cc_auth_token';

// Attach the stored JWT to every request. Lives at module scope so it's
// installed exactly once, before any request fires.
axios.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

const StableInput = memo(({ placeholder, onValueChange, initialValue = '', type = "text", inputMode = "text" }) => {
  const [value, setValue] = useState(initialValue);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onValueChange) onValueChange(newValue);
  };

  return (
    <input
      type={type}
      inputMode={inputMode}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', marginBottom: 12, border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 16, background: '#fff', outline: 'none', transition: 'border-color .15s, box-shadow .15s', display: 'block' }}
      onFocus={e => { e.target.style.borderColor = '#fb7185'; e.target.style.boxShadow = '0 0 0 3px rgba(251,113,133,0.2)'; }}
      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
    />
  );
});
StableInput.displayName = 'StableInput';

const StableSelect = memo(({ options, placeholder, onValueChange, initialValue = '' }) => {
  const [value, setValue] = useState(initialValue);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onValueChange) onValueChange(newValue);
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', marginBottom: 12, border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 16, background: '#fff', outline: 'none', appearance: 'none', display: 'block', backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'><path fill=\'%23475569\' d=\'M6 8L0 0h12z\'/></svg>")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 18px center' }}
    >
      <option value="">{placeholder}</option>
      {options.map(opt => <option key={opt}>{opt}</option>)}
    </select>
  );
});
StableSelect.displayName = 'StableSelect';

const StableTextArea = memo(({ placeholder, rows, onValueChange, initialValue = '' }) => {
  const [value, setValue] = useState(initialValue);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onValueChange) onValueChange(newValue);
  };

  return (
    <textarea
      placeholder={placeholder}
      rows={rows}
      value={value}
      onChange={handleChange}
      style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', marginBottom: 12, border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 16, fontFamily: 'inherit', resize: 'vertical', outline: 'none', display: 'block' }}
      onFocus={e => { e.target.style.borderColor = '#fb7185'; e.target.style.boxShadow = '0 0 0 3px rgba(251,113,133,0.2)'; }}
      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
    />
  );
});
StableTextArea.displayName = 'StableTextArea';

const Card = memo(({ children }) => (
  <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderRadius: 20, boxShadow: '0 10px 40px -10px rgba(15, 23, 42, 0.15), 0 2px 6px -1px rgba(15, 23, 42, 0.05)', padding: 28, border: '1px solid rgba(226, 232, 240, 0.8)' }}>
    {children}
  </div>
));
Card.displayName = 'Card';

const Button = memo(({ onClick, disabled, children, primary = true, id }) => (
  <button id={id} onClick={onClick} disabled={disabled} style={{
    width: '100%', boxSizing: 'border-box', padding: '14px 24px', display: 'block',
    background: disabled ? '#e2e8f0' : primary ? 'linear-gradient(135deg, #fb7185 0%, #f97316 100%)' : 'white',
    color: disabled ? '#94a3b8' : primary ? 'white' : '#fb7185',
    border: disabled ? 'none' : primary ? 'none' : '1px solid #fb7185',
    borderRadius: 12, fontWeight: 600, fontSize: 16,
    boxShadow: disabled ? 'none' : primary ? '0 4px 12px -2px rgba(251, 113, 133, 0.4)' : 'none',
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    transition: 'transform .12s, box-shadow .12s',
  }}
    onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(1px)'; }}
    onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
  >{children}</button>
));
Button.displayName = 'Button';

const Logo = memo(() => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
    <svg className="cc-logo" width="76" height="76" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="ClaimCompass logo">
      <defs>
        <linearGradient id="lgFace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e7490" />
          <stop offset="55%" stopColor="#0891b2" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id="lgNeedle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="49%" stopColor="#fff" />
          <stop offset="51%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <radialGradient id="lgGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(20,184,166,0.55)" />
          <stop offset="100%" stopColor="rgba(20,184,166,0)" />
        </radialGradient>
      </defs>
      <circle className="cc-logo-glow" cx="20" cy="20" r="19" fill="url(#lgGlow)" />
      <circle cx="20" cy="20" r="17" fill="url(#lgFace)" />
      <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      {[0, 90, 180, 270].map(deg => (
        <rect key={deg} x="19.4" y="4" width="1.2" height="3.2" fill="rgba(255,255,255,0.8)" transform={`rotate(${deg} 20 20)`} />
      ))}
      <g className="cc-logo-needle" style={{ transformOrigin: '20px 20px' }}>
        <path d="M20 7 L23 20 L20 33 L17 20 Z" fill="url(#lgNeedle)" />
      </g>
      <circle cx="20" cy="20" r="2.2" fill="#0f172a" stroke="#fff" strokeWidth="1" />
    </svg>
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, alignItems: 'center', marginTop: 2 }}>
      <span style={{ fontWeight: 800, fontSize: 22, color: '#0f172a', letterSpacing: '-0.02em' }}>ClaimCompass</span>
      <span style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Your post-accident navigator</span>
    </div>
    <style dangerouslySetInnerHTML={{ __html: `
      .cc-logo { display: block; }
      /* Anchor exactly at the compass center (viewBox 40x40, so 20,20). */
      .cc-logo-needle {
        transform-origin: 20px 20px;
        animation: cc-needle 3.6s ease-in-out infinite;
      }
      .cc-logo-glow {
        transform-origin: 20px 20px;
        animation: cc-glow 4s ease-in-out infinite;
      }
      /* Pure sinusoidal vacillation around the center — no drift. */
      @keyframes cc-needle {
        0%, 100% { transform: rotate(-10deg); }
        50%      { transform: rotate( 10deg); }
      }
      @keyframes cc-glow {
        0%, 100% { opacity: 0.55; }
        50%      { opacity: 1; }
      }
      @media (prefers-reduced-motion: reduce) {
        .cc-logo-needle, .cc-logo-glow { animation: none; }
      }
    ` }} />
  </div>
));
Logo.displayName = 'Logo';

const Header = memo(({ onBack, canGoBack }) => (
  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, minHeight: 116 }}>
    {canGoBack && (
      <button onClick={onBack} aria-label="Go back" style={{
        position: 'absolute', left: 0, top: 4,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.7)', color: '#475569',
        border: '1px solid #e2e8f0', borderRadius: 999, padding: '8px 14px',
        fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        backdropFilter: 'blur(6px)',
      }}>← Back</button>
    )}
    <Logo />
  </div>
));
Header.displayName = 'Header';

const StepIndicator = memo(({ step }) => (
  <div style={{ marginBottom: 32 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
      {['Document', 'Tow', 'Claim', 'Repair', 'Legal'].map((s, i) => (
        <div key={s} style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            width: 34, height: 34, margin: '0 auto 6px', borderRadius: 999,
            background: step > i + 1 ? 'linear-gradient(135deg, #10b981, #059669)' : step === i + 1 ? 'linear-gradient(135deg, #fb7185, #f97316)' : '#e2e8f0',
            color: step >= i + 1 ? 'white' : '#94a3b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600, fontSize: 14,
            boxShadow: step === i + 1 ? '0 4px 10px -2px rgba(251, 113, 133, 0.4)' : 'none',
            transition: 'all .2s',
          }}>
            {step > i + 1 ? '✓' : i + 1}
          </div>
          <span style={{ fontSize: 11, fontWeight: step === i + 1 ? 600 : 400, color: step === i + 1 ? '#0f172a' : '#94a3b8' }}>{s}</span>
        </div>
      ))}
    </div>
    <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2 }}>
      <div style={{ width: `${(step / 5) * 100}%`, height: 3, background: 'linear-gradient(90deg, #fb7185, #10b981)', borderRadius: 2, transition: 'width .3s' }} />
    </div>
  </div>
));
StepIndicator.displayName = 'StepIndicator';

// PageShell — Apple-style page swipe carousel.
//   Swipe LEFT  (dx < 0) → forward / next page
//   Swipe RIGHT (dx > 0) → back / previous page
// The CURRENT and INCOMING pages translate together: as the current slides off,
// the incoming slides in by the same number of pixels. On release we commit
// (finish the slide with an ease-out) or cancel (spring back).
const PageShell = memo(({ currentStep, renderStep, onForward, onBack, canForward, canBack, enterDirection }) => {
  const stateRef = useRef(null);
  const lockedAxis = useRef(null); // null | 'x' | 'y'
  const currentRef = useRef(null);
  const incomingRef = useRef(null);
  const justSwipedRef = useRef(false);
  const initialMountRef = useRef(true);
  const [incomingStep, setIncomingStep] = useState(null);

  // Smooth easings used everywhere a release/commit/auto-nav lands.
  // easeOutExpo-style — starts fast, glides to a gentle stop.
  const SETTLE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const SETTLE_MS = 540;
  // For the cancel snap-back: subtle overshoot, also gentle.
  const SPRING = 'cubic-bezier(.18,.89,.32,1.18)';
  const SPRING_MS = 460;

  const isFormElement = (target) => {
    let el = target;
    while (el && el !== document.body) {
      const tag = (el.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      el = el.parentNode;
    }
    return false;
  };

  // Position both pages for a given drag offset.
  // Convention: dx<0 → forward, incoming peeks from RIGHT (offset = +width).
  //             dx>0 → back,    incoming peeks from LEFT  (offset = -width).
  const setTransforms = (dx, transition) => {
    const width = window.innerWidth || 400;
    const cur = currentRef.current;
    const inc = incomingRef.current;
    if (cur) {
      cur.style.transition = transition || 'none';
      cur.style.transform = dx === 0 ? '' : `translate3d(${dx}px, 0, 0)`;
    }
    if (inc) {
      const sign = dx < 0 ? 1 : -1;
      inc.style.transition = transition || 'none';
      inc.style.transform = `translate3d(${dx + sign * width}px, 0, 0)`;
    }
  };

  const beginDrag = (x, y) => {
    stateRef.current = {
      startX: x, startY: y, lastX: x, lastT: performance.now(),
      vx: 0, time: Date.now(), showed: false,
    };
    lockedAxis.current = null;
    setTransforms(0, 'none');
  };

  const updateDrag = (x, y) => {
    const st = stateRef.current;
    if (!st) return;
    const dx = x - st.startX;
    const dy = y - st.startY;

    if (!lockedAxis.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      lockedAxis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (lockedAxis.current === 'y') {
        stateRef.current = null;
        return;
      }
    }

    // Mount incoming page once horizontal intent is clear.
    if (!st.showed && Math.abs(dx) > 4) {
      const wantsForward = dx < 0 && canForward;
      const wantsBack    = dx > 0 && canBack;
      if (wantsForward) setIncomingStep(currentStep + 1);
      else if (wantsBack) setIncomingStep(currentStep - 1);
      st.showed = true;
    }

    // Rubber-band when the direction isn't allowed.
    let drag = dx;
    if ((dx < 0 && !canForward) || (dx > 0 && !canBack)) drag = dx * 0.25;

    // Velocity tracking.
    const now = performance.now();
    const dt = Math.max(1, now - st.lastT);
    st.vx = (x - st.lastX) / dt;
    st.lastX = x;
    st.lastT = now;

    setTransforms(drag, 'none');
  };

  const endDrag = (x) => {
    const st = stateRef.current;
    stateRef.current = null;
    if (!st) return;
    const wasHorizontal = lockedAxis.current === 'x';
    lockedAxis.current = null;
    if (!wasHorizontal) return; // not a swipe — leave everything as-is

    const dx = x - st.startX;
    const width = window.innerWidth || 400;
    const distanceThreshold = Math.min(120, width * 0.28);
    const velocityThreshold = 0.45; // px/ms (~450 px/s)
    const commit =
      (Math.abs(dx) > distanceThreshold || Math.abs(st.vx) > velocityThreshold) &&
      ((dx < 0 && canForward) || (dx > 0 && canBack));

    if (commit) {
      const target = dx < 0 ? -width : width;
      setTransforms(target, `transform ${SETTLE_MS}ms ${SETTLE}`);
      // Wait for the slide to finish before swapping step state, so the new
      // current page mounts at translateX(0) just as the incoming arrives at 0.
      setTimeout(() => {
        justSwipedRef.current = true;
        if (dx < 0) onForward && onForward();
        else onBack && onBack();
      }, SETTLE_MS - 10);
    } else {
      setTransforms(0, `transform ${SPRING_MS}ms ${SPRING}`);
      setTimeout(() => setIncomingStep(null), SPRING_MS + 20);
    }
  };

  const onPointerDown = (e) => {
    if (isFormElement(e.target)) { stateRef.current = null; return; }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    beginDrag(e.clientX, e.clientY);
  };
  const onPointerMove = (e) => { if (stateRef.current) updateDrag(e.clientX, e.clientY); };
  const onPointerUp   = (e) => endDrag(e.clientX);
  const onPointerCancel = () => {
    const wasHorizontal = lockedAxis.current === 'x';
    stateRef.current = null;
    lockedAxis.current = null;
    if (!wasHorizontal) return;
    setTransforms(0, 'transform .2s ease-out');
    setTimeout(() => setIncomingStep(null), 220);
  };

  // Touch-event fallback.
  const onTouchStart = (e) => {
    if (isFormElement(e.target)) { stateRef.current = null; return; }
    if (stateRef.current) return;
    const t = e.touches[0];
    if (t) beginDrag(t.clientX, t.clientY);
  };
  const onTouchMove = (e) => {
    if (!stateRef.current) return;
    const t = e.touches[0];
    if (!t) return;
    updateDrag(t.clientX, t.clientY);
  };
  const onTouchEnd = (e) => {
    const t = e.changedTouches[0];
    if (t) endDrag(t.clientX);
  };

  // When currentStep actually changes:
  //   - if it came from a swipe-commit, the visual was already animated by the
  //     drag handler; just reset transforms with no animation.
  //   - otherwise (button click, back arrow), slide the new page in from the
  //     side that matches the navigation direction, using the same gentle ease.
  useIsoLayoutEffect(() => {
    setIncomingStep(null);
    if (initialMountRef.current) {
      initialMountRef.current = false;
      setTransforms(0, 'none');
      return;
    }
    if (justSwipedRef.current) {
      justSwipedRef.current = false;
      setTransforms(0, 'none');
      return;
    }
    const width = window.innerWidth || 400;
    const fromForward = enterDirection !== 'back';
    const startOffset = fromForward ? width : -width;
    // Place new page off-screen synchronously (before paint), then animate home.
    setTransforms(startOffset, 'none');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransforms(0, `transform ${SETTLE_MS}ms ${SETTLE}`);
      });
    });
  }, [currentStep, enterDirection]);

  const pageBoxStyle = {
    maxWidth: 640, margin: '0 auto', padding: '20px 18px 28px',
    willChange: 'transform',
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #fff7ed 0%, #f8fafc 30%, #f8fafc 100%)',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a',
        touchAction: 'pan-y',
        position: 'relative',
        overflowX: 'hidden',
      }}>
      <div style={{ position: 'relative' }}>
        <div ref={currentRef} style={pageBoxStyle} key={`cur-${currentStep}`}>
          {renderStep(currentStep)}
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#94a3b8', pointerEvents: 'none' }}>
            ← Drag To Navigate →
          </div>
        </div>
        {incomingStep != null && (
          <div ref={incomingRef} style={{ ...pageBoxStyle, position: 'absolute', top: 0, left: 0, right: 0 }} key={`inc-${incomingStep}`}>
            {renderStep(incomingStep)}
            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#94a3b8', pointerEvents: 'none' }}>
              ← Drag To Navigate →
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
PageShell.displayName = 'PageShell';

// Centered card layout used by the auth screen — visually matches the
// in-flow Card but stands on its own background so it can host the full
// login/signup experience before the wizard ever mounts.
const AuthShell = memo(({ children }) => (
  <div style={{
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #fff7ed 0%, #f8fafc 30%, #f8fafc 100%)',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    color: '#0f172a',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 18px',
  }}>
    <div style={{ width: '100%', maxWidth: 440 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <Logo />
      </div>
      {children}
    </div>
  </div>
));
AuthShell.displayName = 'AuthShell';

const AuthScreen = ({ onAuthed }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === 'signup';

  const submit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    if (isSignup && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const url = isSignup ? '/api/auth/register' : '/api/auth/login';
      const body = isSignup ? { email, password, name: name || undefined } : { email, password };
      const res = await axios.post(url, body);
      window.localStorage.setItem(AUTH_TOKEN_KEY, res.data.token);
      onAuthed(res.data.user);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map(d => d.msg).join(', ')
        : detail || err.message || 'Something went wrong.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '14px 16px', marginBottom: 12,
    border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 16, background: '#fff',
    outline: 'none', display: 'block', fontFamily: 'inherit',
  };

  return (
    <AuthShell>
      <Card>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
          {isSignup ? 'Create your account' : 'Sign in'}
        </h1>
        <p style={{ color: '#64748b', marginBottom: 20, fontSize: 15 }}>
          {isSignup ? 'Track your claim from a single secure account.' : 'Welcome back. Pick up where you left off.'}
        </p>

        <form onSubmit={submit} noValidate>
          {isSignup && (
            <input
              type="text"
              placeholder="Full name (optional)"
              autoComplete="name"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder={isSignup ? 'Password (min 8 characters)' : 'Password'}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
            required
            minLength={isSignup ? 8 : 1}
          />

          {error && (
            <div role="alert" style={{
              background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca',
              padding: '10px 14px', borderRadius: 12, marginBottom: 12, fontSize: 14,
            }}>{error}</div>
          )}

          <Button onClick={submit} disabled={submitting}>
            {submitting ? (isSignup ? 'Creating account...' : 'Signing in...') : (isSignup ? 'Create account' : 'Sign in')}
          </Button>
        </form>

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 14, color: '#64748b' }}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => { setError(''); setMode(isSignup ? 'login' : 'signup'); }}
            style={{ background: 'none', border: 'none', color: '#fb7185', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 14 }}
          >
            {isSignup ? 'Sign in' : 'Create one'}
          </button>
        </div>
      </Card>
    </AuthShell>
  );
};

export default function Home() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [whatsNext, setWhatsNext] = useState("");
  const [photos, setPhotos] = useState([]);
  const [selectedTow, setSelectedTow] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [needRental, setNeedRental] = useState(false);
  const [injurySeverity, setInjurySeverity] = useState('none');
  const [analysis, setAnalysis] = useState('');
  const [legalReferralLink, setLegalReferralLink] = useState('');
  const [hasInjuries, setHasInjuries] = useState(false);
  const [direction, setDirection] = useState('forward');

  const locationRef = useRef(null);
  const formValues = useRef({
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    insuranceCompany: '',
    policyNumber: '',
    claimDescription: '',
    hasInjuries: false,
    injuryDescription: '',
    offerAmount: ''
  });

  // On mount: if we have a stored token, validate it via /api/auth/me before
  // showing the wizard. Invalid/expired → drop back to the auth screen.
  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem(AUTH_TOKEN_KEY) : null;
    if (!token) {
      setAuthChecked(true);
      return;
    }
    axios.get('/api/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => window.localStorage.removeItem(AUTH_TOKEN_KEY))
      .finally(() => setAuthChecked(true));
  }, []);

  // Once authenticated, start (or restart) the claim session.
  useEffect(() => {
    if (!user) return;
    axios.post('/api/start').then(res => {
      setSessionId(res.data.session_id);
      setWhatsNext(res.data.whats_next);
    }).catch(err => {
      if (err.response?.status === 401) {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        setUser(null);
      } else {
        console.error('Start error:', err);
      }
    });
  }, [user]);

  const handleLogout = useCallback(async () => {
    try { await axios.post('/api/auth/logout'); } catch (e) { /* token already invalid is fine */ }
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
    setSessionId(null);
    setStep(1);
    setPhotos([]);
    setSelectedTow(null);
    setSelectedShop(null);
    setNeedRental(false);
    setInjurySeverity('none');
    setAnalysis('');
    setLegalReferralLink('');
    setHasInjuries(false);
  }, []);

  const handleNext = useCallback(async (stepData) => {
    setLoading(true);
    try {
      const res = await axios.post(`/api/step${step}`, { session_id: sessionId, ...stepData });
      setWhatsNext(res.data.whats_next);
      if (res.data.analysis) setAnalysis(res.data.analysis);
      if (res.data.legal_referral_link) setLegalReferralLink(res.data.legal_referral_link);
      setDirection('forward');
      setStep(res.data.next_step || step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error:', err);
      alert('Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  }, [step, sessionId]);

  const handleBack = useCallback(() => {
    setDirection('back');
    setStep(s => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle the chosen photo file. Uses multipart/form-data so phone photos
  // (multi-megabyte) stream as raw bytes instead of ballooning ~33% as
  // base64 inside a JSON body. Avoids the proxy/body-size 500 we saw on
  // production. The <input> is a real DOM element wrapped by a <label>
  // because iOS Safari over HTTPS refuses to open the camera for an input
  // that was created in JS and never attached to the document.
  const handlePhotoFile = useCallback(async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      e.target.value = '';
      return;
    }
    try {
      const fd = new FormData();
      fd.append('session_id', sessionId || 'anon');
      fd.append('file', file, file.name || 'photo.jpg');
      await axios.post('/api/upload-photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        maxContentLength: 30 * 1024 * 1024,
        maxBodyLength: 30 * 1024 * 1024,
      });
      setPhotos(prev => [...prev, URL.createObjectURL(file)]);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Photo upload failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      // Reset so picking the same file twice still fires onChange.
      e.target.value = '';
    }
  }, [sessionId]);

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      locationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const btn = document.getElementById('locationBtn');
      if (btn) {
        const originalText = btn.innerText;
        btn.innerText = '✓ Location saved!';
        setTimeout(() => { btn.innerText = originalText; }, 2000);
      }
    }, (err) => {
      alert('Could not get location: ' + err.message);
    });
  };

  const onVehicleMakeChange = useCallback((val) => { formValues.current.vehicleMake = val; }, []);
  const onVehicleModelChange = useCallback((val) => { formValues.current.vehicleModel = val; }, []);
  const onVehicleYearChange = useCallback((val) => { formValues.current.vehicleYear = val; }, []);
  const onInsuranceCompanyChange = useCallback((val) => { formValues.current.insuranceCompany = val; }, []);
  const onPolicyNumberChange = useCallback((val) => { formValues.current.policyNumber = val; }, []);
  const onClaimDescriptionChange = useCallback((val) => { formValues.current.claimDescription = val; }, []);
  const onInjuryDescriptionChange = useCallback((val) => { formValues.current.injuryDescription = val; }, []);
  const onOfferAmountChange = useCallback((val) => { formValues.current.offerAmount = val; }, []);

  // Lifted submit actions — also used by swipe-right.
  const submitStep1 = useCallback(() => {
    handleNext({
      photos,
      vehicle_info: {
        make: formValues.current.vehicleMake,
        model: formValues.current.vehicleModel,
        year: formValues.current.vehicleYear
      },
      location: locationRef.current
    });
  }, [handleNext, photos]);

  const submitStep2 = useCallback(() => {
    handleNext({ confirm_tow: true, preferred_tow_company: selectedTow?.company });
  }, [handleNext, selectedTow]);

  const submitStep3 = useCallback(() => {
    handleNext({
      insurance_company: formValues.current.insuranceCompany,
      policy_number: formValues.current.policyNumber,
      description: formValues.current.claimDescription,
      injuries: formValues.current.hasInjuries,
      injury_description: formValues.current.injuryDescription
    });
  }, [handleNext]);

  const submitStep4 = useCallback(() => {
    handleNext({ repair_shop_id: selectedShop?.name, need_rental: needRental });
  }, [handleNext, selectedShop, needRental]);

  const submitStep5 = useCallback(() => {
    handleNext({ injury_severity: injurySeverity, settlement_amount_offered: parseFloat(formValues.current.offerAmount) || null });
  }, [handleNext, injurySeverity]);

  const canForward =
    loading ? false :
    step === 1 ? photos.length > 0 :
    step === 2 ? !!selectedTow :
    step === 3 ? true :
    step === 4 ? !!selectedShop :
    step === 5 ? true : false;

  const swipeForward = useCallback(() => {
    if (!canForward) return;
    if (step === 1) submitStep1();
    else if (step === 2) submitStep2();
    else if (step === 3) submitStep3();
    else if (step === 4) submitStep4();
    else if (step === 5) submitStep5();
  }, [canForward, step, submitStep1, submitStep2, submitStep3, submitStep4, submitStep5]);

  const swipeBack = useCallback(() => {
    if (step > 1) handleBack();
  }, [step, handleBack]);

  const renderStep = useCallback((n) => {
    if (n === 1) return (
      <>
        <Header canGoBack={false} />
        <StepIndicator step={n} />
        <Card>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a', letterSpacing: '-0.02em' }}>Document the accident</h1>
          <p style={{ color: '#64748b', marginBottom: 24, fontSize: 15 }}>Take clear photos of the damage from multiple angles.</p>

          <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', padding: '12px 16px', borderRadius: 12, marginBottom: 20, border: '1px solid #fcd34d', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span style={{ color: '#92400e', fontSize: 13, fontWeight: 500 }}>Safety first — move to a safe location before taking photos.</span>
          </div>

          <label style={{ display: 'block', position: 'relative', border: '2px dashed #cbd5e1', borderRadius: 14, padding: '28px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', marginBottom: 16, transition: 'border-color .15s, background .15s' }}>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoFile}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}
            />
            <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>📸</span>
            <span style={{ color: '#475569', fontSize: 14, fontWeight: 500 }}>Tap To Take A Photo</span>
          </label>

          {photos.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#475569' }}>Uploaded photos ({photos.length})</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {photos.map((p, i) => <img key={i} src={p} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0' }} alt="Damage" />)}
              </div>
            </div>
          )}

          <StableSelect
            options={['Toyota', 'Honda', 'Ford', 'Tesla', 'BMW', 'Mercedes']}
            placeholder="Select Vehicle Make"
            onValueChange={onVehicleMakeChange}
            initialValue={formValues.current.vehicleMake}
          />

          <StableInput
            placeholder="Model (e.g., Camry)"
            onValueChange={onVehicleModelChange}
            initialValue={formValues.current.vehicleModel}
          />

          <StableInput
            type="number"
            inputMode="numeric"
            placeholder="Year (e.g., 2020)"
            onValueChange={onVehicleYearChange}
            initialValue={formValues.current.vehicleYear}
          />

          <div style={{ marginBottom: 12 }}>
            <Button id="locationBtn" onClick={getLocation} primary={false}>
              📍 Share My Location
            </Button>
          </div>

          <Button onClick={submitStep1} disabled={!canForward}>
            {loading ? 'Processing...' : 'Continue →'}
          </Button>
        </Card>
      </>
    );
    if (n === 2) return (
      <>
        <Header onBack={handleBack} canGoBack={true} />
        <StepIndicator step={n} />
        <Card>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a', letterSpacing: '-0.02em' }}>Request a tow truck</h1>
          <p style={{ color: '#64748b', marginBottom: 20, fontSize: 15 }}>Choose a provider — we'll dispatch right away.</p>

          <div style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)', padding: '12px 16px', borderRadius: 12, marginBottom: 20, border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🚨</span>
            <span style={{ color: '#991b1b', fontSize: 13, fontWeight: 500 }}>Do not drive a damaged vehicle — even if it seems fine.</span>
          </div>

          {[
            { company: "QuickTow", eta: 15, price: 75, rating: 4.9 },
            { company: "SafeRoad", eta: 25, price: 65, rating: 4.7 }
          ].map(tow => {
            const sel = selectedTow?.company === tow.company;
            return (
              <label key={tow.company} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, border: sel ? '2px solid #fb7185' : '1px solid #e2e8f0', borderRadius: 14, marginBottom: 10, cursor: 'pointer', background: sel ? '#fff1f2' : 'white', transition: 'all .15s' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{tow.company}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>ETA {tow.eta} min • ${tow.price} • ⭐ {tow.rating}</div>
                </div>
                <input type="radio" name="tow" checked={sel} onChange={() => setSelectedTow(tow)} style={{ width: 20, height: 20, accentColor: '#fb7185' }} />
              </label>
            );
          })}

          <div style={{ marginTop: 8 }}>
            <Button onClick={submitStep2} disabled={!canForward}>
              {loading ? 'Dispatching...' : 'Dispatch Tow Truck →'}
            </Button>
          </div>
        </Card>
      </>
    );
    if (n === 3) return (
      <>
        <Header onBack={handleBack} canGoBack={true} />
        <StepIndicator step={n} />
        <Card>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a', letterSpacing: '-0.02em' }}>File your claim</h1>
          <p style={{ color: '#64748b', marginBottom: 20, fontSize: 15 }}>Tell us what happened — we'll draft the narrative.</p>

          <div style={{ background: 'linear-gradient(135deg, #ccfbf1, #e0e7ff)', padding: '12px 16px', borderRadius: 12, marginBottom: 20, border: '1px solid #99f6e4', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🤖</span>
            <span style={{ color: '#3730a3', fontSize: 13, fontWeight: 500 }}>DeepSeek AI will write your claim narrative.</span>
          </div>

          <StableSelect
            options={['State Farm', 'Geico', 'Progressive', 'Allstate', 'USAA']}
            placeholder="Select Insurance Company"
            onValueChange={onInsuranceCompanyChange}
            initialValue={formValues.current.insuranceCompany}
          />

          <StableInput
            placeholder="Policy Number"
            onValueChange={onPolicyNumberChange}
            initialValue={formValues.current.policyNumber}
          />

          <StableTextArea
            placeholder="Describe What Happened..."
            rows={4}
            onValueChange={onClaimDescriptionChange}
            initialValue={formValues.current.claimDescription}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '8px 0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hasInjuries}
              onChange={e => {
                setHasInjuries(e.target.checked);
                formValues.current.hasInjuries = e.target.checked;
              }}
              style={{ width: 20, height: 20, accentColor: '#fb7185' }} />
            <span style={{ color: '#334155', fontSize: 15 }}>I or my passengers were injured</span>
          </label>

          {hasInjuries && (
            <StableTextArea
              placeholder="Describe Your Injuries..."
              rows={2}
              onValueChange={onInjuryDescriptionChange}
              initialValue={formValues.current.injuryDescription}
            />
          )}

          <Button onClick={submitStep3} disabled={loading}>
            {loading ? 'AI is writing your claim...' : 'Generate Claim →'}
          </Button>
        </Card>
      </>
    );
    if (n === 4) return (
      <>
        <Header onBack={handleBack} canGoBack={true} />
        <StepIndicator step={n} />
        <Card>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a', letterSpacing: '-0.02em' }}>Schedule repair</h1>
          <p style={{ color: '#64748b', marginBottom: 20, fontSize: 15 }}>Pick a repair shop and rental option.</p>

          {[
            { name: "Fix Auto Collision", days: 3, rating: 4.8, location: "1.2 miles away" },
            { name: "Caliber Collision", days: 5, rating: 4.6, location: "2.5 miles away" }
          ].map(shop => {
            const sel = selectedShop?.name === shop.name;
            return (
              <label key={shop.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, border: sel ? '2px solid #fb7185' : '1px solid #e2e8f0', borderRadius: 14, marginBottom: 10, cursor: 'pointer', background: sel ? '#fff1f2' : 'white', transition: 'all .15s' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{shop.name}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{shop.days} days • ⭐ {shop.rating} • {shop.location}</div>
                </div>
                <input type="radio" name="shop" checked={sel} onChange={() => setSelectedShop(shop)} style={{ width: 20, height: 20, accentColor: '#fb7185' }} />
              </label>
            );
          })}

          <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '8px 0', cursor: 'pointer' }}>
            <input type="checkbox" checked={needRental} onChange={e => setNeedRental(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#fb7185' }} />
            <span style={{ color: '#334155', fontSize: 15 }}>I need a rental car while my vehicle is being repaired</span>
          </label>

          <Button onClick={submitStep4} disabled={!canForward}>
            {loading ? 'Booking...' : 'Schedule Repair →'}
          </Button>
        </Card>
      </>
    );
    return (
      <>
      <Header onBack={handleBack} canGoBack={true} />
      <StepIndicator step={n} />
      <Card>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a', letterSpacing: '-0.02em' }}>Legal & settlement</h1>
        <p style={{ color: '#64748b', marginBottom: 20, fontSize: 15 }}>Get AI-powered settlement analysis and legal guidance.</p>

        <div style={{ background: 'linear-gradient(135deg, #ccfbf1, #e0e7ff)', padding: '12px 16px', borderRadius: 12, marginBottom: 20, border: '1px solid #99f6e4', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚖️</span>
          <span style={{ color: '#3730a3', fontSize: 13, fontWeight: 500 }}>Our AI will analyze your offer and recommend next steps.</span>
        </div>

        <select value={injurySeverity} onChange={e => setInjurySeverity(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', marginBottom: 12, border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 16, background: 'white', display: 'block' }}>
          <option value="none">No injuries</option>
          <option value="minor">Minor injuries (treated at scene)</option>
          <option value="moderate">Moderate injuries (ER visit)</option>
          <option value="severe">Severe injuries (hospitalized)</option>
        </select>

        <StableInput
          type="number"
          inputMode="numeric"
          placeholder="Settlement Offer Received (if any)"
          onValueChange={onOfferAmountChange}
          initialValue={formValues.current.offerAmount}
        />

        <Button onClick={submitStep5} disabled={loading}>
          {loading ? 'AI analyzing...' : 'Analyze Settlement →'}
        </Button>

        {analysis && (
          <div style={{ marginTop: 24, padding: 18, background: 'linear-gradient(135deg, #ecfeff, #e0f2fe)', borderRadius: 14, border: '1px solid #a5f3fc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>🤖</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0e7490' }}>AI Analysis</h3>
            </div>
            <p style={{ color: '#334155', lineHeight: 1.55, marginBottom: 16, fontSize: 14 }}>{analysis}</p>
            <Button onClick={() => window.open(legalReferralLink || 'https://claimcompass.app/legal', '_blank')} primary={false}>
              Get Free Legal Consultation →
            </Button>
          </div>
        )}
      </Card>
      </>
    );
  }, [
    canForward, loading, photos, hasInjuries, selectedTow, selectedShop, needRental, injurySeverity,
    analysis, legalReferralLink, handlePhotoFile, getLocation, handleBack,
    submitStep1, submitStep2, submitStep3, submitStep4, submitStep5,
    onVehicleMakeChange, onVehicleModelChange, onVehicleYearChange,
    onInsuranceCompanyChange, onPolicyNumberChange, onClaimDescriptionChange,
    onInjuryDescriptionChange, onOfferAmountChange,
  ]);

  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #fff7ed 0%, #f8fafc 30%, #f8fafc 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#64748b', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}>Loading…</div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthed={u => setUser(u)} />;
  }

  return (
    <>
      <div style={{
        position: 'fixed', top: 12, right: 14, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(255,255,255,0.85)', border: '1px solid #e2e8f0',
        borderRadius: 999, padding: '6px 10px 6px 14px', fontSize: 13,
        color: '#475569', backdropFilter: 'blur(6px)',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}>
        <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.name || user.email}
        </span>
        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: 'none', color: '#fb7185',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
            padding: '4px 6px',
          }}
        >Log out</button>
      </div>
      <PageShell
        currentStep={step}
        renderStep={renderStep}
        canForward={canForward}
        canBack={step > 1}
        onForward={swipeForward}
        onBack={swipeBack}
        enterDirection={direction}
      />
    </>
  );
}
