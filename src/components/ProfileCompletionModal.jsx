// =============================================================================
// components/ProfileCompletionModal.jsx — "Tell us about you" prompt
// -----------------------------------------------------------------------------
// Shown to existing members whose account doc predates the identity fields. It
// collects first/last name + birth month & day and merge-writes them onto
// users/{uid} via updateUserProfile(). Rendered by <ProfileCompletionGate>,
// which decides *whether* to show it; this component just owns the form.
// =============================================================================

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MONTHS, daysForMonth } from '../utils/identity';

export default function ProfileCompletionModal() {
  const { userDoc, updateUserProfile } = useAuth();

  // Seed from whatever is already on the doc (a partial legacy record might have
  // a name but no birthday, etc.) so members only fill the gaps.
  const [firstName, setFirstName] = useState(userDoc?.firstName || '');
  const [lastName, setLastName] = useState(userDoc?.lastName || '');
  const [birthMonth, setBirthMonth] = useState(
    userDoc?.birthMonth ? String(userDoc.birthMonth) : ''
  );
  const [birthDay, setBirthDay] = useState(
    userDoc?.birthDay ? String(userDoc.birthDay) : ''
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      await updateUserProfile({ firstName, lastName, birthMonth, birthDay });
      // No manual close — once the doc updates, the gate stops rendering us.
    } catch {
      setError('Could not save. Please try again.');
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded-md border border-[#DDD6C8] dark:border-[#3A352C] bg-white dark:bg-[#171511] px-3 py-2 text-[#26241F] dark:text-[#ECE7DD] outline-none transition focus:border-[#9A958A] focus:ring-1 focus:ring-[#C9C1B0]';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-completion-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60 px-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-[#EAE3D6] dark:border-[#2A2620] bg-[#FAF8F3] dark:bg-[#221F1B] p-7 font-serif text-[#26241F] dark:text-[#ECE7DD] shadow-xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
        <h2
          id="profile-completion-title"
          className="font-['Newsreader'] text-[24px] leading-tight text-[#1F1D18] dark:text-[#F1EDE5]"
        >
          A few details
        </h2>
        <p className="mt-2 text-sm text-[#6F6A60] dark:text-[#A39C8E]">
          Help us personalize Aura — your name and the day you were born.
        </p>

        <form onSubmit={handleSubmit} className="mt-5">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm text-[#6F6A60] dark:text-[#A39C8E]">First name</span>
              <input
                type="text"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[#6F6A60] dark:text-[#A39C8E]">Last name</span>
              <input
                type="text"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>

          <div className="mb-4">
            <span className="mb-1 block text-sm text-[#6F6A60] dark:text-[#A39C8E]">Birthday</span>
            <div className="grid grid-cols-2 gap-3">
              <select
                required
                value={birthMonth}
                onChange={(e) => {
                  setBirthMonth(e.target.value);
                  if (birthDay && Number(birthDay) > daysForMonth(e.target.value).length) {
                    setBirthDay('');
                  }
                }}
                className={inputCls}
              >
                <option value="" disabled>Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                required
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                className={inputCls}
              >
                <option value="" disabled>Day</option>
                {daysForMonth(birthMonth || 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-xs text-[#A8A294] dark:text-[#6E685D]">Just the day — no year.</p>
          </div>

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-400"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#26241F] dark:bg-[#ECE7DD] px-4 py-2.5 text-[#FAF8F3] dark:text-[#1F1D18] transition hover:bg-[#3A3730] dark:hover:bg-[#D6D1C6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}
