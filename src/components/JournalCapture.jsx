// =============================================================================
// components/JournalCapture.jsx — Confirm-before-route journal capture
// -----------------------------------------------------------------------------
// Detection is two-tier:
//   1. Instant client-side name-matching (detectEntities) runs on every
//      debounced keystroke against the user's profiles, groups, and active
//      habits. All results start UNCHECKED — nothing routes without the user's
//      explicit confirmation.
//   2. Optional AI suggestions ("Suggest with AI") call the suggestJournalEntities
//      Cloud Function, which can surface prayer-request text and habit
//      completions the local matcher would miss (e.g. partial names, inference).
//
// On save, the confirmed payload (IDs + requests + habit flags) is emitted via
// onSave and written to the journal doc. The Cloud Function trigger then routes
// only to the confirmed targets.
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Check, Plus } from 'lucide-react';
import { detectEntities, detectPrayerRequests } from '../utils/entityDetection';

function nowStamp() {
  const d = new Date();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${weekday} · ${time}`;
}

// Tiny chip for a profile or group entity, toggleable.
function EntityChip({ entity, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-full border py-[5px] pl-[6px] pr-3 transition-all duration-150 ${
        checked
          ? 'border-[#CADBCB] dark:border-[#33473A] bg-[#EEF3EC] dark:bg-[#1B2620]'
          : 'border-[#E6DFD2] dark:border-[#302C25] bg-white dark:bg-[#221F1B]'
      }`}
    >
      <span
        className={`flex h-[22px] w-[22px] items-center justify-center font-['Newsreader'] text-[12px] ${
          entity.kind === 'group' ? 'rounded-[7px]' : 'rounded-full'
        } ${
          checked
            ? 'bg-[#5F7F67] dark:bg-[#80A789] text-white'
            : 'bg-[#ECE7DB] dark:bg-[#2C2820] text-[#6F6A60] dark:text-[#A39C8E]'
        }`}
      >
        {checked ? (
          <Check className="h-[11px] w-[11px]" strokeWidth={3} />
        ) : (
          entity.initial
        )}
      </span>
      <span
        className={`font-['Newsreader'] text-[14px] ${
          checked ? 'text-[#26241F] dark:text-[#ECE7DD]' : 'text-[#6F6A60] dark:text-[#A39C8E]'
        }`}
      >
        {entity.name}
      </span>
    </button>
  );
}

// A single habit row with a "check to log" toggle and a "done today?" toggle.
function HabitRow({ name, checked, completed, disabled, onToggleChecked, onToggleCompleted }) {
  return (
    <div
      className={`flex items-center gap-[10px] rounded-[13px] border px-3 py-[10px] transition-all duration-150 ${
        disabled
          ? 'border-[#EBE6DC] dark:border-[#2A2620] bg-transparent opacity-50'
          : checked
          ? 'border-[#CADBCB] dark:border-[#33473A] bg-[#EEF3EC] dark:bg-[#1B2620]'
          : 'border-[#E6E0D5] dark:border-[#302C25] bg-white dark:bg-[#221F1B]'
      }`}
    >
      {/* Main check toggle */}
      <button
        type="button"
        disabled={disabled}
        onClick={onToggleChecked}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
          checked
            ? 'bg-[#5F7F67] dark:bg-[#80A789]'
            : 'border-[1.5px] border-[#D2CBBC] dark:border-[#46413A]'
        }`}
      >
        {checked ? (
          <Check className="h-[11px] w-[11px] text-white" strokeWidth={3} />
        ) : (
          !disabled && <Plus className="h-[12px] w-[12px] text-[#C3BCAD] dark:text-[#544E45]" strokeWidth={2} />
        )}
      </button>

      {/* Habit name */}
      <span
        className={`flex-1 text-[14px] leading-[1.35] ${
          checked ? 'text-[#3A372F] dark:text-[#D6D1C6]' : 'text-[#6F6A60] dark:text-[#A39C8E]'
        }`}
      >
        {name}
      </span>

      {/* Done today? toggle — only visible when the row is checked */}
      {checked && (
        <button
          type="button"
          onClick={onToggleCompleted}
          className={`flex items-center gap-[6px] rounded-full px-2 py-[3px] text-[11px] transition-all duration-150 ${
            completed
              ? 'bg-[#A8845C] dark:bg-[#C49A6C] text-white'
              : 'border border-[#D2CBBC] dark:border-[#46413A] text-[#9A958A] dark:text-[#827C70]'
          }`}
        >
          {completed && <Check className="h-[9px] w-[9px]" strokeWidth={3} />}
          <span>done today</span>
        </button>
      )}
    </div>
  );
}

// A client-detected "pray for [Name]" row.
function PrayerRow({ profileName, prayerText, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-start gap-[10px] rounded-[13px] border px-3 py-[10px] text-left w-full transition-all duration-150 ${
        checked
          ? 'border-[#CADBCB] dark:border-[#33473A] bg-[#EEF3EC] dark:bg-[#1B2620]'
          : 'border-[#E6E0D5] dark:border-[#302C25] bg-white dark:bg-[#221F1B]'
      }`}
    >
      <span
        className={`mt-[1px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
          checked
            ? 'bg-[#5F7F67] dark:bg-[#80A789]'
            : 'border-[1.5px] border-[#D2CBBC] dark:border-[#46413A]'
        }`}
      >
        {checked ? (
          <Check className="h-[11px] w-[11px] text-white" strokeWidth={3} />
        ) : (
          <Plus className="h-[12px] w-[12px] text-[#C3BCAD] dark:text-[#544E45]" strokeWidth={2} />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className={`text-[14px] leading-[1.35] ${checked ? 'text-[#3A372F] dark:text-[#D6D1C6]' : 'text-[#6F6A60] dark:text-[#A39C8E]'}`}>
          Pray for <span className="font-semibold">{profileName}</span>
        </div>
        <div className="mt-[2px] text-[11px] text-[#9A958A] dark:text-[#827C70] italic truncate">
          "{prayerText}"
        </div>
      </div>
    </button>
  );
}

// A checkable AI-suggested prayer request row.
function RequestRow({ text, profileName, profileId, checked, onToggle }) {
  const canRoute = !!profileId;
  return (
    <button
      type="button"
      disabled={!canRoute}
      onClick={canRoute ? onToggle : undefined}
      className={`flex items-start gap-[10px] rounded-[13px] border px-3 py-[10px] text-left transition-all duration-150 w-full ${
        !canRoute
          ? 'border-[#EBE6DC] dark:border-[#2A2620] opacity-50 cursor-default'
          : checked
          ? 'border-[#CADBCB] dark:border-[#33473A] bg-[#EEF3EC] dark:bg-[#1B2620]'
          : 'border-[#E6E0D5] dark:border-[#302C25] bg-white dark:bg-[#221F1B]'
      }`}
    >
      <span
        className={`mt-[1px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
          checked && canRoute
            ? 'bg-[#5F7F67] dark:bg-[#80A789]'
            : 'border-[1.5px] border-[#D2CBBC] dark:border-[#46413A]'
        }`}
      >
        {checked && canRoute ? (
          <Check className="h-[11px] w-[11px] text-white" strokeWidth={3} />
        ) : (
          canRoute && <Plus className="h-[12px] w-[12px] text-[#C3BCAD] dark:text-[#544E45]" strokeWidth={2} />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div
          className={`text-[14px] leading-[1.35] ${
            checked && canRoute ? 'text-[#3A372F] dark:text-[#D6D1C6]' : 'text-[#6F6A60] dark:text-[#A39C8E]'
          }`}
        >
          {text}
        </div>
        <div className="mt-[2px] text-[11px] text-[#9A958A] dark:text-[#827C70]">
          {canRoute ? `→ ${profileName}` : 'no match in your network'}
        </div>
      </div>
    </button>
  );
}

export default function JournalCapture({
  profiles = [],
  groups = [],
  habits = [],
  analyzeDraft,
  onSave = () => {},
  onCancel = () => {},
}) {
  const [text, setText] = useState('');
  const [stamp] = useState(nowStamp);

  // --- Local detection state ---
  // detectedEntities: profiles + groups found in text (start unchecked)
  const [detectedEntities, setDetectedEntities] = useState([]);
  // detectedHabits: active habits found in text (start unchecked)
  const [detectedHabits, setDetectedHabits] = useState([]);
  // entityChecked / habitChecked: toggle state for each detected item
  const [entityChecked, setEntityChecked] = useState({});
  const [habitChecked, setHabitChecked] = useState({});
  const [habitCompleted, setHabitCompleted] = useState({});

  // --- Prayer-pattern detection state ---
  const [detectedPrayerRequests, setDetectedPrayerRequests] = useState([]);
  const [prayerChecked, setPrayerChecked] = useState({});

  // --- AI state ---
  const [aiRequests, setAiRequests] = useState([]); // { key, text, profileId, profileName }
  const [aiRequestChecked, setAiRequestChecked] = useState({});
  // Extra habits surfaced by AI but not locally detected (have a matchedHabitId)
  const [aiExtraHabits, setAiExtraHabits] = useState([]); // { id, name }
  // AI habit notes (from suggestion.note) — keyed by habitId
  const [habitNote, setHabitNote] = useState({});
  // Greyed-out AI habit suggestions that had no matching habit in the user's data
  const [aiDisabledHabits, setAiDisabledHabits] = useState([]); // string titles
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiRan, setAiRan] = useState(false);

  // --- Saved state ---
  const [saved, setSaved] = useState(false);
  const [savedSummary, setSavedSummary] = useState(null);

  // Debounce ref for detection
  const debounceRef = useRef(null);

  // Run local detection on text change, debounced 400ms.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const results = detectEntities(text, profiles, groups, habits);
      const newEntities = results.filter((r) => r.kind !== 'habit');
      const newHabits = results.filter((r) => r.kind === 'habit');

      setDetectedEntities(newEntities);
      setDetectedHabits(newHabits);
      // Preserve checked state for IDs still detected; drop stale ones.
      setEntityChecked((prev) => {
        const next = {};
        for (const e of newEntities) next[e.id] = prev[e.id] ?? false;
        return next;
      });
      setHabitChecked((prev) => {
        const next = {};
        for (const h of newHabits) next[h.id] = prev[h.id] ?? false;
        return next;
      });
      setHabitCompleted((prev) => {
        const next = {};
        for (const h of newHabits) next[h.id] = prev[h.id] ?? false;
        return next;
      });

      const prayerResults = detectPrayerRequests(text, profiles);
      setDetectedPrayerRequests(prayerResults);
      setPrayerChecked((prev) => {
        const next = {};
        for (const pr of prayerResults) next[pr.profileId] = prev[pr.profileId] ?? false;
        return next;
      });
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [text, profiles, groups, habits]);

  // --- AI suggestion handler ---
  async function handleAnalyze() {
    if (!text.trim() || !analyzeDraft) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { suggestions = [], habitSuggestions = [] } = await analyzeDraft(text);

      // Dedupe AI requests by key (in case user taps Suggest twice).
      const localHabitIds = new Set(detectedHabits.map((h) => h.id));
      const extraHabits = [];
      const disabledHabits = [];

      habitSuggestions.forEach((hs) => {
        if (!hs.matchedHabitId) {
          disabledHabits.push(hs.title);
          return;
        }
        if (!localHabitIds.has(hs.matchedHabitId)) {
          // AI found a habit the local matcher missed — add it
          extraHabits.push({ id: hs.matchedHabitId, name: hs.matchedHabitTitle || hs.title });
          setHabitChecked((prev) => ({ ...prev, [hs.matchedHabitId]: prev[hs.matchedHabitId] ?? false }));
          setHabitCompleted((prev) => ({
            ...prev,
            [hs.matchedHabitId]: prev[hs.matchedHabitId] ?? hs.completed,
          }));
        } else {
          // Pre-fill note and completed for existing local habit (user can override)
          setHabitCompleted((prev) => ({
            ...prev,
            [hs.matchedHabitId]: prev[hs.matchedHabitId] || hs.completed,
          }));
        }
        setHabitNote((prev) => ({ ...prev, [hs.matchedHabitId]: hs.note || '' }));
      });

      setAiExtraHabits(extraHabits);
      setAiDisabledHabits(disabledHabits);

      const newRequests = suggestions.map((s, i) => ({
        key: `ai-req-${i}-${Date.now()}`,
        text: s.request,
        profileId: s.matchedProfileId,
        profileName: s.matchedProfileName,
      }));
      setAiRequests(newRequests);
      setAiRequestChecked({});
      setAiRan(true);
    } catch {
      setAiError("Couldn't reach Aura — try again");
    } finally {
      setAiLoading(false);
    }
  }

  // --- Toggles ---
  function toggleEntity(id) {
    setEntityChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function toggleHabitChecked(id) {
    setHabitChecked((prev) => {
      const nowChecked = !prev[id];
      // Default to completed when checking on; clear when unchecking.
      setHabitCompleted((p) => ({ ...p, [id]: nowChecked }));
      return { ...prev, [id]: nowChecked };
    });
  }
  function toggleHabitCompleted(id) {
    setHabitCompleted((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function toggleAiRequest(key) {
    setAiRequestChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }
  function togglePrayerChecked(profileId) {
    setPrayerChecked((prev) => ({ ...prev, [profileId]: !prev[profileId] }));
  }

  // --- Derived confirmed selections ---
  const confirmedProfileIds = detectedEntities
    .filter((e) => e.kind === 'profile' && entityChecked[e.id])
    .map((e) => e.id);
  const confirmedGroupIds = detectedEntities
    .filter((e) => e.kind === 'group' && entityChecked[e.id])
    .map((e) => e.id);
  const confirmedRequests = aiRequests
    .filter((r) => aiRequestChecked[r.key] && r.profileId)
    .map((r) => ({ profileId: r.profileId, text: r.text }));
  const allHabitRows = [...detectedHabits, ...aiExtraHabits];
  const confirmedHabits = allHabitRows
    .filter((h) => habitChecked[h.id])
    .map((h) => ({ habitId: h.id, completed: !!habitCompleted[h.id], note: habitNote[h.id] || '' }));
  const confirmedPrayerItems = detectedPrayerRequests
    .filter((pr) => prayerChecked[pr.profileId]);

  const confirmedTotal =
    confirmedProfileIds.length + confirmedGroupIds.length + confirmedRequests.length +
    confirmedHabits.length + confirmedPrayerItems.length;
  const saveLabel = confirmedTotal > 0 ? `Save & route · ${confirmedTotal} confirmed` : 'Save & route · log only';

  function handleSave() {
    // Prayer-request profiles are auto-included in log routing.
    const allConfirmedProfileIds = [
      ...new Set([...confirmedProfileIds, ...confirmedPrayerItems.map((pr) => pr.profileId)]),
    ];
    const allConfirmedRequests = [
      ...confirmedRequests,
      ...confirmedPrayerItems.map((pr) => ({ profileId: pr.profileId, text: pr.prayerText })),
    ];
    const summary = {
      confirmedEntities: detectedEntities.filter((e) => entityChecked[e.id]),
      confirmedRequests: allConfirmedRequests,
      confirmedHabits,
      confirmedPrayerItems,
    };
    setSavedSummary(summary);
    setSaved(true);
    onSave({
      text,
      confirmedProfileIds: allConfirmedProfileIds,
      confirmedGroupIds,
      confirmedRequests: allConfirmedRequests,
      confirmedHabits,
    });
  }

  function handleWriteAnother() {
    setText('');
    setDetectedEntities([]);
    setDetectedHabits([]);
    setEntityChecked({});
    setHabitChecked({});
    setHabitCompleted({});
    setHabitNote({});
    setAiRequests([]);
    setAiRequestChecked({});
    setAiExtraHabits([]);
    setAiDisabledHabits([]);
    setAiRan(false);
    setAiError(null);
    setDetectedPrayerRequests([]);
    setPrayerChecked({});
    setSaved(false);
    setSavedSummary(null);
  }

  const hasDetection =
    detectedEntities.length > 0 ||
    detectedPrayerRequests.length > 0 ||
    allHabitRows.length > 0 ||
    aiRan ||
    aiLoading;

  return (
    <div className="flex min-h-full flex-col bg-[#FAF8F3] dark:bg-[#171511] pb-8">
      {/* ---- Header ---- */}
      <div className="px-[22px] pt-14 pb-4">
        <div className="mb-4 flex items-center justify-between text-[13px] text-[#9A958A] dark:text-[#827C70]">
          <button type="button" onClick={onCancel} className="hover:text-[#6F6A60] dark:hover:text-[#A39C8E]">
            Cancel
          </button>
          <span className="text-[11px] font-semibold uppercase tracking-[1.4px]">Journal</span>
          <span className="opacity-0">Cancel</span>
        </div>
        <div className="font-['Newsreader'] text-[32px] leading-[1.05] text-[#1F1D18] dark:text-[#F1EDE5]">
          {saved ? 'Saved' : 'New entry'}
        </div>
        <div className="mt-[3px] text-[12px] text-[#9A958A] dark:text-[#827C70]">{stamp}</div>
      </div>

      {saved && savedSummary ? (
        /* ================= Saved & routed confirmation ================= */
        <div className="flex flex-col items-center px-7 pt-[30px] text-center">
          <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full border border-[#CADBCB] dark:border-[#33473A] bg-[#EEF3EC] dark:bg-[#1B2620]">
            <Check className="h-7 w-7 text-[#5F7F67] dark:text-[#80A789]" strokeWidth={2.4} />
          </div>
          <div className="mt-4 font-['Newsreader'] text-[25px] text-[#1F1D18] dark:text-[#F1EDE5]">Saved &amp; routed</div>
          <div className="mt-[6px] max-w-[250px] text-[14px] leading-[1.5] text-[#6F6A60] dark:text-[#A39C8E]">
            {confirmedTotal > 0
              ? 'Your note is now part of the relationships you confirmed.'
              : 'Your note is saved. Nothing was routed.'}
          </div>

          {/* Summary card */}
          {(savedSummary.confirmedEntities.length > 0 ||
            savedSummary.confirmedRequests.length > 0 ||
            savedSummary.confirmedHabits.length > 0 ||
            savedSummary.confirmedPrayerItems.length > 0) && (
            <div className="mt-[22px] w-full overflow-hidden rounded-[18px] border border-[#EBE6DC] dark:border-[#322E27] bg-white dark:bg-[#221F1B] text-left shadow-[0_1px_2px_rgba(40,36,31,0.03)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.32)]">
              {savedSummary.confirmedRequests.length > 0 && (
                <div className="flex items-center gap-[11px] border-b border-[#F1ECE2] dark:border-[#272320] px-[15px] py-[13px]">
                  <span className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-[#A8845C] dark:bg-[#C49A6C]" />
                  <span className="text-[14px] text-[#3A372F] dark:text-[#D6D1C6]">
                    {savedSummary.confirmedRequests.length}{' '}
                    {savedSummary.confirmedRequests.length === 1 ? 'request' : 'requests'} added
                  </span>
                </div>
              )}
              {savedSummary.confirmedEntities.map((ent, i) => (
                <div
                  key={ent.id}
                  className={`flex items-center gap-[11px] px-[15px] py-[13px] ${
                    i < savedSummary.confirmedEntities.length - 1 ||
                    savedSummary.confirmedHabits.length > 0
                      ? 'border-b border-[#F1ECE2] dark:border-[#272320]'
                      : ''
                  }`}
                >
                  <span className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-[#5F7F67] dark:bg-[#80A789]" />
                  <span className="text-[14px] text-[#3A372F] dark:text-[#D6D1C6]">
                    Logged to <span className="font-semibold">{ent.name}</span>
                  </span>
                </div>
              ))}
              {savedSummary.confirmedPrayerItems.map((pr, i, arr) => (
                <div
                  key={pr.profileId}
                  className={`flex items-center gap-[11px] px-[15px] py-[13px] ${
                    i < arr.length - 1 || savedSummary.confirmedHabits.filter((h) => h.completed).length > 0
                      ? 'border-b border-[#F1ECE2] dark:border-[#272320]'
                      : ''
                  }`}
                >
                  <span className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-[#7B9AC0] dark:bg-[#8CAFD6]" />
                  <span className="text-[14px] text-[#3A372F] dark:text-[#D6D1C6]">
                    Prayer request added for <span className="font-semibold">{pr.profileName}</span>
                  </span>
                </div>
              ))}
              {savedSummary.confirmedHabits
                .filter((h) => h.completed)
                .map((h, i, arr) => {
                  const habit = habits.find((hb) => hb.id === h.habitId);
                  if (!habit) return null;
                  return (
                    <div
                      key={h.habitId}
                      className={`flex items-center gap-[11px] px-[15px] py-[13px] ${
                        i < arr.length - 1 ? 'border-b border-[#F1ECE2] dark:border-[#272320]' : ''
                      }`}
                    >
                      <span className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-[#A8845C] dark:bg-[#C49A6C]" />
                      <span className="text-[14px] text-[#3A372F] dark:text-[#D6D1C6]">
                        Marked <span className="font-semibold">{habit.title}</span> done today
                      </span>
                    </div>
                  );
                })}
            </div>
          )}

          <button
            type="button"
            onClick={handleWriteAnother}
            className="mt-[22px] font-['Newsreader'] text-[15px] italic text-[#A8845C] dark:text-[#C49A6C]"
          >
            Write another
          </button>
        </div>
      ) : (
        /* ================= Compose + detection ================= */
        <div className="block">
          {/* Compose paper */}
          <div className="px-4">
            <div className="rounded-[20px] border border-[#EBE6DC] dark:border-[#322E27] bg-white dark:bg-[#221F1B] p-[17px] shadow-[0_1px_2px_rgba(40,36,31,0.03)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.32)]">
              <div className="mb-[11px] text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A] dark:text-[#827C70]">
                Tonight&apos;s entry
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="Write the night as it happened…"
                className="w-full resize-none bg-transparent font-['Source_Serif_4'] text-[16px] leading-[1.65] text-[#3A372F] dark:text-[#D6D1C6] placeholder:text-[#B0AB9E] dark:placeholder:text-[#6E685D] focus:outline-none"
              />
            </div>
          </div>

          {/* Aura noticed panel — shown whenever there's something to show */}
          {hasDetection && (
            <div className="px-4 pt-4">
              <div className="rounded-[18px] border border-[#EAE3D6] dark:border-[#2A2620] bg-[#F4F0E8] dark:bg-[#1E1B16] px-[15px] py-[14px]">
                {/* Panel header */}
                <div className="mb-[13px] flex items-center gap-2">
                  <Sparkles className="h-[14px] w-[14px] text-[#A8845C] dark:text-[#C49A6C]" strokeWidth={1.4} />
                  <span className="font-['Newsreader'] text-[15px] text-[#26241F] dark:text-[#ECE7DD]">Aura noticed</span>
                </div>

                {/* People / groups chips */}
                {detectedEntities.length > 0 && (
                  <>
                    <div className="mb-[9px] text-[10px] font-semibold uppercase tracking-[1.4px] text-[#9A958A] dark:text-[#827C70]">
                      Logging this note to
                    </div>
                    <div className="mb-[14px] flex flex-wrap gap-2">
                      {detectedEntities.map((ent) => (
                        <EntityChip
                          key={ent.id}
                          entity={ent}
                          checked={!!entityChecked[ent.id]}
                          onToggle={() => toggleEntity(ent.id)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Prayer requests detected from text patterns */}
                {detectedPrayerRequests.length > 0 && (
                  <>
                    <div className="mb-[9px] text-[10px] font-semibold uppercase tracking-[1.4px] text-[#9A958A] dark:text-[#827C70]">
                      Prayer requests
                    </div>
                    <div className="mb-[14px] flex flex-col gap-2">
                      {detectedPrayerRequests.map((pr) => (
                        <PrayerRow
                          key={pr.profileId}
                          profileName={pr.profileName}
                          prayerText={pr.prayerText}
                          checked={!!prayerChecked[pr.profileId]}
                          onToggle={() => togglePrayerChecked(pr.profileId)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Habits section */}
                {allHabitRows.length > 0 && (
                  <>
                    <div className="mb-[9px] text-[10px] font-semibold uppercase tracking-[1.4px] text-[#9A958A] dark:text-[#827C70]">
                      Habits mentioned
                    </div>
                    <div className="mb-[14px] flex flex-col gap-2">
                      {allHabitRows.map((h) => (
                        <HabitRow
                          key={h.id}
                          name={h.name}
                          checked={!!habitChecked[h.id]}
                          completed={!!habitCompleted[h.id]}
                          disabled={false}
                          onToggleChecked={() => toggleHabitChecked(h.id)}
                          onToggleCompleted={() => toggleHabitCompleted(h.id)}
                        />
                      ))}
                      {aiDisabledHabits.map((title) => (
                        <HabitRow key={title} name={title} checked={false} completed={false} disabled />
                      ))}
                    </div>
                  </>
                )}

                {/* Suggest with AI */}
                {!aiRan && (
                  <button
                    type="button"
                    disabled={aiLoading || !text.trim()}
                    onClick={handleAnalyze}
                    className="mt-[2px] flex items-center gap-[7px] rounded-[11px] border border-[#E0D9CC] dark:border-[#302C25] bg-white dark:bg-[#221F1B] px-[11px] py-[8px] transition-opacity disabled:opacity-50"
                  >
                    <Sparkles
                      className={`h-[13px] w-[13px] text-[#A8845C] dark:text-[#C49A6C] ${aiLoading ? 'animate-pulse' : ''}`}
                      strokeWidth={1.4}
                    />
                    <span className="font-['Newsreader'] text-[13px] text-[#6F6A60] dark:text-[#A39C8E]">
                      {aiLoading ? 'Asking Aura…' : 'Suggest with AI'}
                    </span>
                  </button>
                )}
                {aiError && (
                  <p className="mt-[8px] text-[12px] text-[#A8845C] dark:text-[#C49A6C]">{aiError}</p>
                )}

                {/* AI prayer request suggestions */}
                {aiRan && aiRequests.length > 0 && (
                  <>
                    <div className="mb-[9px] mt-[14px] text-[10px] font-semibold uppercase tracking-[1.4px] text-[#9A958A] dark:text-[#827C70]">
                      Suggested prayer requests
                    </div>
                    <div className="flex flex-col gap-2">
                      {aiRequests.map((r) => (
                        <RequestRow
                          key={r.key}
                          text={r.text}
                          profileId={r.profileId}
                          profileName={r.profileName}
                          checked={!!aiRequestChecked[r.key]}
                          onToggle={() => toggleAiRequest(r.key)}
                        />
                      ))}
                    </div>
                  </>
                )}
                {aiRan && aiRequests.length === 0 && (
                  <p className="mt-[8px] font-['Newsreader'] text-[13px] italic text-[#A39E92] dark:text-[#6E685D]">
                    No additional prayer requests found.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* If nothing detected yet, show a subtle "Suggest with AI" prompt */}
          {!hasDetection && text.trim().length > 0 && (
            <div className="px-4 pt-3">
              <button
                type="button"
                disabled={aiLoading}
                onClick={handleAnalyze}
                className="flex items-center gap-[7px] text-[13px] text-[#A39E92] dark:text-[#6E685D] disabled:opacity-50"
              >
                <Sparkles className="h-[13px] w-[13px]" strokeWidth={1.4} />
                <span className="font-['Newsreader'] italic">Suggest with AI</span>
              </button>
            </div>
          )}

          {/* Save */}
          <div className="px-4 pt-[18px]">
            <button
              type="button"
              onClick={handleSave}
              disabled={!text.trim()}
              className="w-full rounded-[15px] bg-[#A8845C] dark:bg-[#C49A6C] py-[14px] text-center font-['Newsreader'] text-[16px] text-white shadow-[0_2px_6px_rgba(168,132,92,0.25)] dark:shadow-[0_2px_6px_rgba(196,154,108,0.35)] transition-colors hover:bg-[#9a774f] dark:hover:bg-[#b38a5e] disabled:opacity-50"
            >
              {saveLabel}
            </button>
            <div className="mt-[10px] text-center font-['Newsreader'] text-[12px] italic text-[#A39E92] dark:text-[#6E685D]">
              Nothing reaches a profile without your nod.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
