// =============================================================================
// components/ProfileCard.jsx — Queue person / request card (Phase 3, dumb)
// -----------------------------------------------------------------------------
// One relational card in the Daily Queue. Round avatar = person; rounded-square
// avatar = standalone request (design §01). Quiet metadata row carries the
// priority + cycle rate + request count.
//
// Completion mechanics (ARCHITECTURE.md §5):
//   - Tapping the check circle (or swiping right) marks it complete.
//   - That triggers an auto-collapse: the card animates height -> 0 + fade,
//     then calls onComplete(id) so the parent can unmount it from the DOM.
//   - Inline quick-note input for jotting a thought without leaving the queue.
//
// Props:
//   profile    : { id, name, sub, kind, initial, priorityLabel, cycleLabel?,
//                  priorityRate?, requestCount? }
//   onComplete : (id) => void   — called AFTER the collapse transition ends.
//   onNote     : (id, text) => void  — optional, fired on quick-note submit.
//   onOpen     : (id) => void   — optional, open the full profile detail.
//   showNote   : boolean (default true) — render the inline note input.
// =============================================================================

import { useRef, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';

const PRIORITY_COLOR = {
  High: 'text-[#A8845C]',
  Medium: 'text-[#6F6A60]',
  Low: 'text-[#9A958A]',
  Group: 'text-[#5F7F67]',
};

function cycleText(profile) {
  if (profile.cycleLabel) return profile.cycleLabel;
  if (profile.priorityRate) return `every ${profile.priorityRate} days`;
  return null;
}

export default function ProfileCard({
  profile,
  onComplete = () => {},
  onNote = () => {},
  onOpen = null,
  showNote = true,
}) {
  const [done, setDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [note, setNote] = useState('');
  const firedRef = useRef(false); // guard onTransitionEnd against multi-fire

  const isRequest = profile.kind === 'request';
  const reqCount = profile.requestCount || 0;
  const cycle = cycleText(profile);

  function complete() {
    if (leaving) return;
    setDone(true);
    // Brief beat so the check + strike-through register before the collapse.
    setTimeout(() => setLeaving(true), 120);
  }

  function handleTransitionEnd(e) {
    if (e.propertyName !== 'max-height' || !leaving || firedRef.current) return;
    firedRef.current = true;
    onComplete(profile.id);
  }

  // Lightweight swipe-right -> complete (touch devices).
  const touchX = useRef(null);
  function onTouchStart(e) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e) {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (dx > 60) complete();
  }

  function submitNote(e) {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    onNote(profile.id, text);
    setNote('');
  }

  return (
    <div
      onTransitionEnd={handleTransitionEnd}
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        leaving ? 'max-h-0 opacity-0 mb-0' : 'max-h-[260px] opacity-100 mb-[9px]'
      }`}
    >
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="flex items-center gap-3 rounded-[18px] border border-[#EBE6DC] bg-white px-[14px] py-[11px] shadow-[0_1px_2px_rgba(40,36,31,0.03)]"
      >
        {/* Check circle */}
        <button
          type="button"
          onClick={complete}
          aria-label={`Mark ${profile.name} complete`}
          className="-my-2 flex h-[46px] w-[30px] flex-shrink-0 items-center justify-center"
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] transition-all duration-150 ${
              done ? 'border-[#5F7F67] bg-[#5F7F67]' : 'border-[#D2CBBC] bg-transparent'
            }`}
          >
            {done && <Check className="h-[13px] w-[13px] text-white" strokeWidth={2.6} />}
          </span>
        </button>

        {/* Avatar — round (person) vs rounded-square (request) */}
        <div
          onClick={onOpen ? () => onOpen(profile.id) : undefined}
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center font-['Newsreader'] text-[18px] transition-opacity duration-200 ${
            isRequest
              ? 'rounded-[11px] bg-[#EDEFEA] text-[#5F7F67]'
              : 'rounded-full bg-[#EFEADF] text-[#6F6A60]'
          } ${done ? 'opacity-50' : 'opacity-100'} ${onOpen ? 'cursor-pointer' : ''}`}
        >
          {profile.initial}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div
            onClick={onOpen ? () => onOpen(profile.id) : undefined}
            className={`font-['Newsreader'] text-[17px] font-medium leading-[1.15] ${
              done ? 'text-[#9A958A] line-through' : 'text-[#26241F]'
            } ${onOpen ? 'cursor-pointer' : ''}`}
          >
            {profile.name}
          </div>
          {profile.sub && (
            <div
              className={`mt-[3px] text-[12.5px] leading-[1.25] text-[#6F6A60] ${
                done ? 'opacity-50' : ''
              }`}
            >
              {profile.sub}
            </div>
          )}
          <div className={`mt-[6px] flex items-center gap-[7px] ${done ? 'opacity-50' : ''}`}>
            {profile.priorityLabel && (
              <span
                className={`text-[11px] font-semibold uppercase tracking-[0.3px] ${
                  PRIORITY_COLOR[profile.priorityLabel] || 'text-[#6F6A60]'
                }`}
              >
                {profile.priorityLabel}
              </span>
            )}
            {cycle && <span className="text-[11px] text-[#A39E92]">· {cycle}</span>}
            {profile.kind === 'person' && reqCount > 0 && (
              <span className="text-[11px] text-[#A39E92]">
                · {reqCount} {reqCount === 1 ? 'request' : 'requests'}
              </span>
            )}
          </div>

          {/* Inline quick-note input */}
          {showNote && (
            <form onSubmit={submitNote} className="mt-[9px]">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Quick note…"
                className="w-full border-b border-[#EFE9DD] bg-transparent pb-1 text-[12.5px] text-[#3A372F] placeholder:text-[#C3BCAD] focus:border-[#D2CBBC] focus:outline-none"
              />
            </form>
          )}
        </div>

        <button
          type="button"
          onClick={onOpen ? () => onOpen(profile.id) : undefined}
          aria-label={`Open ${profile.name}`}
          className="flex-shrink-0"
          disabled={!onOpen}
        >
          <ChevronRight className="h-[14px] w-[14px] text-[#9A958A] opacity-35" />
        </button>
      </div>
    </div>
  );
}
