// =============================================================================
// pages/AuthPage.jsx — Log In / Sign Up (Phase 2)
// -----------------------------------------------------------------------------
// Single page that toggles between modes. Sign Up reveals the Secret Invite
// Code field and routes through the gated signup() in AuthContext.
//
// Design vibe (ARCHITECTURE.md §2): clean, focused, minimal, all serif,
// quietly faith-rooted — soft off-white ground, charcoal text, understated
// borders. Mobile-first Tailwind (defaults target phones; md: scales up).
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Turn raw Firebase/auth errors into calm, human messages.
function friendlyError(err) {
  // Our own gated-auth throw comes through as a plain Error message.
  if (err?.message === 'Invalid invite code') return 'Invalid invite code.';

  switch (err?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/missing-email':
      return 'Please enter your email address.';
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/email-already-in-use':
      return 'An account already exists for that email.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default function AuthPage() {
  const { login, signup, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(''); // calm confirmation messages
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';

  function switchMode(next) {
    setMode(next);
    setError('');
    setNotice('');
  }

  function toggleMode() {
    switchMode(isSignup ? 'login' : 'signup');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (isReset) {
        await resetPassword(email.trim());
        // Generic confirmation — we don't reveal whether the email exists.
        setNotice('If an account exists for that email, a reset link is on its way.');
      } else if (isSignup) {
        await signup(email.trim(), password, inviteCode);
        navigate('/', { replace: true });
      } else {
        await login(email.trim(), password);
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6 font-serif text-stone-800">
      <div className="w-full max-w-sm">
        {/* Masthead — understated, devotional */}
        <header className="mb-10 text-center">
          <h1 className="text-3xl tracking-tight text-stone-900">Aura</h1>
          <p className="mt-2 text-sm italic text-stone-500">
            A quiet place to keep your people and your practice.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-stone-200 bg-white/70 p-8 shadow-sm"
        >
          <h2 className="mb-6 text-center text-xl text-stone-900">
            {isReset
              ? 'Reset your password'
              : isSignup
                ? 'Create your account'
                : 'Welcome back'}
          </h2>

          {isReset && (
            <p className="mb-6 text-center text-sm text-stone-500">
              Enter your email and we'll send you a link to set a new password.
            </p>
          )}

          <label className="mb-4 block">
            <span className="mb-1 block text-sm text-stone-600">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500 focus:ring-1 focus:ring-stone-400"
            />
          </label>

          {/* Password is hidden in reset mode */}
          {!isReset && (
            <label className="mb-4 block">
              <span className="mb-1 flex items-baseline justify-between">
                <span className="text-sm text-stone-600">Password</span>
                {!isSignup && (
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="text-xs text-stone-500 underline underline-offset-4 transition hover:text-stone-800"
                  >
                    Forgot password?
                  </button>
                )}
              </span>
              <input
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none transition focus:border-stone-500 focus:ring-1 focus:ring-stone-400"
              />
            </label>
          )}

          {/* Invite code only in sign-up mode */}
          {isSignup && (
            <label className="mb-4 block">
              <span className="mb-1 block text-sm text-stone-600">Secret Invite Code</span>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Provided by your host"
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none transition placeholder:text-stone-300 focus:border-stone-500 focus:ring-1 focus:ring-stone-400"
              />
            </label>
          )}

          {/* Error banner */}
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {/* Confirmation banner */}
          {notice && (
            <p
              role="status"
              className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            >
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-stone-900 px-4 py-2.5 text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy
              ? 'Please wait…'
              : isReset
                ? 'Send reset link'
                : isSignup
                  ? 'Sign Up'
                  : 'Log In'}
          </button>
        </form>

        {/* Mode toggle */}
        <p className="mt-6 text-center text-sm text-stone-500">
          {isReset ? (
            <>
              Remembered it?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-medium text-stone-800 underline underline-offset-4 transition hover:text-stone-900"
              >
                Back to log in
              </button>
            </>
          ) : (
            <>
              {isSignup ? 'Already have an account?' : 'Have an invite code?'}{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-stone-800 underline underline-offset-4 transition hover:text-stone-900"
              >
                {isSignup ? 'Log in' : 'Sign up'}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
