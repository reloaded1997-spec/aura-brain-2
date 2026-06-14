// =============================================================================
// components/ProfileCard.jsx — Queue person / request card (Phase 3, dumb)
// =============================================================================

import { useRef, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';

const PRIORITY_COLOR = {
  High:   'text-[#A8845C] dark:text-[#C49A6C]',
  Medium: 'text-[#6F6A60] dark:text-[#A39C8E]',
  Low:    'text-[#9A958A] dark:text-[#827C70]',
  Group:  'text-[#5F7F67] dark:text-[#80A789]',
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
  const [noted, setNoted] = useState(false);
  const firedRef = useRef(false);

  const isRequest = profile.kind === 'request';
  const reqCount = profile.requestCount || 0;
  const cycle = cycleText(profile);

  function complete() {
    if (leaving) return;
    setDone(true);
    setTimeout(() => setLeaving(true), 120);
  }

  function handleTransitionEnd(e) {
    if (e.propertyName !== 'max-height' || !leaving || firedRef.current) return;
    firedRef.current = true;
    onComplete(profile.id);
  }

  const touchX = useRef(null);
  function onTouchStart(e) { touchX.current = e.touches[0].clientX; }
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
    setNoted(true);
    setTimeout(() => setNoted(false), 1800);
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
        className="flex items-center gap-3 rounded-[18px] border border-[#EBE6DC] dark:border-[#322E27] bg-white dark:bg-[#221F1B] px-[14px] py-[11px] shadow-[0_1px_2px_rgba(40,36,31,0.03)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.32)]"
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
              done
                ? 'border-[#5F7F67] dark:border-[#80A789] bg-[#5F7F67] dark:bg-[#80A789]'
                : 'border-[#D2CBBC] dark:border-[#46413A] bg-transparent'
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
              ? 'rounded-[11px] bg-[#EDEFEA] dark:bg-[#1E2A22] text-[#5F7F67] dark:text-[#80A789]'
              : 'rounded-full bg-[#EFEADF] dark:bg-[#2A2620] text-[#6F6A60] dark:text-[#A39C8E]'
          } ${done ? 'opacity-50' : 'opacity-100'} ${onOpen ? 'cursor-pointer' : ''}`}
        >
          {profile.initial}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div
            onClick={onOpen ? () => onOpen(profile.id) : undefined}
            className={`font-['Newsreader'] text-[17px] font-medium leading-[1.15] ${
              done ? 'text-[#9A958A] dark:text-[#827C70] line-through' : 'text-[#26241F] dark:text-[#ECE7DD]'
            } ${onOpen ? 'cursor-pointer' : ''}`}
          >
            {profile.name}
          </div>
          {profile.sub && (
            <div
              className={`mt-[3px] text-[12.5px] leading-[1.25] text-[#6F6A60] dark:text-[#A39C8E] ${
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
                  PRIORITY_COLOR[profile.priorityLabel] || 'text-[#6F6A60] dark:text-[#A39C8E]'
                }`}
              >
                {profile.priorityLabel}
              </span>
            )}
            {cycle && <span className="text-[11px] text-[#A39E92] dark:text-[#6E685D]">· {cycle}</span>}
            {profile.kind === 'person' && reqCount > 0 && (
              <span className="text-[11px] text-[#A39E92] dark:text-[#6E685D]">
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
                placeholder={noted ? 'Saved to their log ✓' : 'Quick note…'}
                className="w-full border-b border-[#EFE9DD] dark:border-[#2A261E] bg-transparent pb-1 text-[12.5px] text-[#3A372F] dark:text-[#D6D1C6] placeholder:text-[#C3BCAD] dark:placeholder:text-[#544E45] focus:border-[#D2CBBC] dark:focus:border-[#46413A] focus:outline-none"
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
          <ChevronRight className="h-[14px] w-[14px] text-[#9A958A] dark:text-[#827C70] opacity-35" />
        </button>
      </div>
    </div>
  );
}
