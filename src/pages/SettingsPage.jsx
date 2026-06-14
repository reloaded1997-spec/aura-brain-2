// =============================================================================
// pages/SettingsPage.jsx — User preferences (persisted to users/{uid}.settings)
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useSettings';
import { requestNotificationPermission } from '../utils/notifications';
import { PRIORITY_RATES } from '../utils/display';

const FONT_SCALE_OPTIONS = [
  { value: 'small',  label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large',  label: 'Large' },
];

function applyFontScale(scale) {
  const cls = document.documentElement.classList;
  cls.remove('font-scale-small', 'font-scale-large');
  if (scale === 'small') cls.add('font-scale-small');
  else if (scale === 'large') cls.add('font-scale-large');
}

// ---- Presentational atoms ---------------------------------------------------

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-[#5F7F67]' : 'bg-[#D7CFBF]'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
}

function Row({ label, sub, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#F1ECE2] px-[15px] py-[14px] last:border-b-0">
      <div className="min-w-0">
        <div className="font-['Newsreader'] text-[15px] text-[#26241F]">{label}</div>
        {sub && <div className="mt-[2px] text-[12px] text-[#9A958A]">{sub}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      {title && (
        <div className="mx-1 mb-[9px] text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]">
          {title}
        </div>
      )}
      <div className="overflow-hidden rounded-[20px] border border-[#EBE6DC] bg-white shadow-[0_1px_2px_rgba(40,36,31,0.03)]">
        {children}
      </div>
    </div>
  );
}

const fieldCls =
  'w-full rounded-lg border border-[#E2DCD0] bg-[#FAF8F3] px-3 py-2 text-[14px] text-[#26241F] placeholder:text-[#B0AB9E] focus:border-[#A8845C] focus:outline-none focus:ring-1 focus:ring-[#D8B98E]';

const selectCls =
  'rounded-lg border border-[#E2DCD0] bg-[#FAF8F3] px-3 py-2 text-[14px] text-[#26241F] focus:border-[#A8845C] focus:outline-none focus:ring-1 focus:ring-[#D8B98E]';

// ---- Main component ---------------------------------------------------------

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, userDoc, logout } = useAuth();
  const { settings, saveSetting, saveSettingNow } = useSettings();

  // Local state for each setting (initialized from Firestore-backed `settings`).
  const [displayName, setDisplayName]                   = useState(settings.displayName);
  const [defaultPriorityRate, setDefaultPriorityRate]   = useState(settings.defaultPriorityRate);
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled);
  const [eveningEnabled, setEveningEnabled]             = useState(settings.eveningReminderEnabled);
  const [eveningTime, setEveningTime]                   = useState(settings.eveningReminderTime);
  const [showAnswered, setShowAnswered]                 = useState(settings.showAnswered);
  const [fontScale, setFontScale]                       = useState(settings.fontScale);
  const [notifError, setNotifError]                     = useState('');

  // Sync local state if userDoc loads after mount (offline → online transition).
  useEffect(() => { setDisplayName(settings.displayName); },         [settings.displayName]);
  useEffect(() => { setDefaultPriorityRate(settings.defaultPriorityRate); }, [settings.defaultPriorityRate]);
  useEffect(() => { setNotificationsEnabled(settings.notificationsEnabled); }, [settings.notificationsEnabled]);
  useEffect(() => { setEveningEnabled(settings.eveningReminderEnabled); }, [settings.eveningReminderEnabled]);
  useEffect(() => { setEveningTime(settings.eveningReminderTime); },   [settings.eveningReminderTime]);
  useEffect(() => { setShowAnswered(settings.showAnswered); },         [settings.showAnswered]);
  useEffect(() => { setFontScale(settings.fontScale); },              [settings.fontScale]);

  // ---- Handlers ----

  function handleDisplayNameChange(e) {
    setDisplayName(e.target.value);
    saveSetting('displayName', e.target.value);
  }

  function handleDefaultRateChange(e) {
    const val = Number(e.target.value);
    setDefaultPriorityRate(val);
    saveSettingNow('defaultPriorityRate', val);
  }

  async function handleMorningToggle(next) {
    setNotifError('');
    if (next) {
      const { granted } = await requestNotificationPermission(user.uid);
      if (!granted) {
        setNotifError('Notification permission was denied. Enable it in your device settings.');
        return;
      }
    }
    setNotificationsEnabled(next);
    saveSettingNow('notificationsEnabled', next);
  }

  function handleEveningToggle(next) {
    setEveningEnabled(next);
    saveSettingNow('eveningReminderEnabled', next);
  }

  function handleEveningTimeChange(e) {
    setEveningTime(e.target.value);
    saveSetting('eveningReminderTime', e.target.value);
  }

  function handleShowAnsweredToggle(next) {
    setShowAnswered(next);
    saveSettingNow('showAnswered', next);
  }

  function handleFontScaleChange(e) {
    const next = e.target.value;
    setFontScale(next);
    saveSettingNow('fontScale', next);
    applyFontScale(next);
  }

  async function handleSignOut() {
    await logout();
    navigate('/auth', { replace: true });
  }

  // ---- Account metadata ----
  const memberSince = userDoc?.createdAt?.toDate
    ? userDoc.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F3] text-[#26241F]">
      {/* Header */}
      <div className="px-[22px] pt-14 pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 flex items-center gap-[6px] text-[13px] text-[#9A958A]"
        >
          <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={2} />
          Back
        </button>
        <div className="font-['Newsreader'] text-[32px] leading-[1.05] text-[#1F1D18]">
          Settings
        </div>
      </div>

      <main className="flex-1 px-4 pb-12">
        {/* Account info */}
        <Section title="Account">
          {user?.email && (
            <Row label="Email">
              <span className="text-[13px] text-[#9A958A]">{user.email}</span>
            </Row>
          )}
          {memberSince && (
            <Row label="Member since">
              <span className="text-[13px] text-[#9A958A]">{memberSince}</span>
            </Row>
          )}
        </Section>

        {/* Profile */}
        <Section title="Profile">
          <div className="px-[15px] py-[14px]">
            <div className="mb-[6px] text-[11px] font-semibold uppercase tracking-[1px] text-[#9A958A]">
              Display name
            </div>
            <input
              type="text"
              className={fieldCls}
              value={displayName}
              onChange={handleDisplayNameChange}
              placeholder="How you want to be greeted"
            />
            <div className="mt-[6px] text-[11px] text-[#B0AB9E]">
              Shown in the daily greeting if set.
            </div>
          </div>
        </Section>

        {/* Queue defaults */}
        <Section title="Queue defaults">
          <Row
            label="Default cadence"
            sub="Applied to new profiles and groups."
          >
            <select className={selectCls} value={defaultPriorityRate} onChange={handleDefaultRateChange}>
              {PRIORITY_RATES.map((r) => (
                <option key={r} value={r}>
                  every {r} days
                </option>
              ))}
            </select>
          </Row>
        </Section>

        {/* Display */}
        <Section title="Display">
          <Row label="Show answered prayers" sub="Reveals completed requests on profile pages.">
            <Toggle checked={showAnswered} onChange={handleShowAnsweredToggle} />
          </Row>
          <Row label="Font size">
            <select className={selectCls} value={fontScale} onChange={handleFontScaleChange}>
              {FONT_SCALE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Row>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Row label="Morning reminder" sub="Daily queue summary when your queue isn't empty.">
            <Toggle checked={notificationsEnabled} onChange={handleMorningToggle} />
          </Row>
          {notifError && (
            <div className="border-b border-[#F1ECE2] px-[15px] pb-[12px] text-[12px]" style={{ color: '#B4502F' }}>
              {notifError}
            </div>
          )}
          <Row label="Evening reminder" sub="Nudge when your queue isn't cleared by evening.">
            <Toggle checked={eveningEnabled} onChange={handleEveningToggle} />
          </Row>
          {eveningEnabled && (
            <div className="border-b border-[#F1ECE2] px-[15px] py-[12px] last:border-b-0">
              <div className="mb-[6px] text-[11px] font-semibold uppercase tracking-[1px] text-[#9A958A]">
                Reminder time
              </div>
              <input
                type="time"
                className={fieldCls}
                value={eveningTime}
                onChange={handleEveningTimeChange}
              />
            </div>
          )}
        </Section>

        {/* Sign out */}
        <Section>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full px-[15px] py-[15px] text-left font-['Newsreader'] text-[15px] text-[#B4502F]"
          >
            Sign out
          </button>
        </Section>
      </main>
    </div>
  );
}
