// components/DailyNoteStrip.jsx — Auto-saving daily scratch pad (Phase 4.1)
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, Loader2 } from 'lucide-react';
import { watchDailyNote, saveDailyNote } from '../firebase/db';

function formatHeaderDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DailyNoteStrip({ uid, dateStr }) {
  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');

  const didMount = useRef(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    const unsub = watchDailyNote(uid, dateStr, (t) => {
      setText(t);
      didMount.current = true;
    });
    return unsub;
  }, [uid, dateStr]);

  useEffect(() => {
    if (!didMount.current) return;
    clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    saveTimer.current = setTimeout(() => {
      saveDailyNote(uid, dateStr, text).then(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      });
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = text ? text.slice(0, 40) : '';

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="flex w-full items-center gap-3 rounded-[16px] border border-[#EBE6DC] dark:border-[#322E27] bg-white dark:bg-[#221F1B] px-[14px] py-[12px] text-left"
      >
        <BookOpen className="h-[16px] w-[16px] flex-shrink-0 text-[#A8845C] dark:text-[#C49A6C]" strokeWidth={1.6} />
        <span className="font-['Newsreader'] text-[14px] text-[#26241F] dark:text-[#ECE7DD]">Today&apos;s note</span>
        <span className="flex-1 truncate text-[13px] italic text-[#9A958A] dark:text-[#827C70]">
          {preview || 'Tap to add…'}
        </span>
        <ChevronDown className="h-[15px] w-[15px] flex-shrink-0 text-[#B0AB9E] dark:text-[#6E685D]" />
      </button>
    );
  }

  return (
    <div className="rounded-[20px] border border-[#EBE6DC] dark:border-[#322E27] bg-white dark:bg-[#221F1B] px-[15px] pb-[15px] pt-[13px] shadow-[0_1px_3px_rgba(40,36,31,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.32)]">
      {/* Header */}
      <div className="mb-[10px] flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A] dark:text-[#827C70]">
          Today&apos;s note · {formatHeaderDate(dateStr)}
        </span>
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-[3px] text-[11px] text-[#5F7F67] dark:text-[#80A789]">
              <Check className="h-[11px] w-[11px]" strokeWidth={2.5} />
              Saved
            </span>
          )}
          {saveStatus === 'saving' && (
            <Loader2 className="h-[11px] w-[11px] animate-spin text-[#9A958A] dark:text-[#827C70]" />
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="text-[13px] text-[#9A958A] dark:text-[#827C70]"
          >
            Done
          </button>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onInput={(e) => {
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        onBlur={() => setTimeout(() => setIsExpanded(false), 150)}
        placeholder="A verse, a word, a thought for today…"
        className="min-h-[90px] w-full resize-none bg-transparent font-['Newsreader'] text-[16px] leading-[1.65] text-[#3A372F] dark:text-[#D6D1C6] placeholder:text-[#B0AB9E] dark:placeholder:text-[#6E685D] focus:outline-none"
        autoFocus
      />
    </div>
  );
}
