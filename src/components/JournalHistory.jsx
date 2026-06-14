// components/JournalHistory.jsx — Read-only journal entry log (Phase 3.5)
import { useMemo } from 'react';

function formatEntryDate(timestamp) {
  if (!timestamp) return 'Just now';
  const d = timestamp.toDate();
  const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

function EntryCard({ entry, profiles }) {
  const preview = entry.text.length > 120 ? entry.text.slice(0, 120) + '…' : entry.text;

  const linkedNames = useMemo(() => {
    if (!entry.linkedProfileIds?.length) return [];
    return entry.linkedProfileIds
      .map((pid) => profiles.find((p) => p.id === pid)?.name)
      .filter(Boolean);
  }, [entry.linkedProfileIds, profiles]);

  return (
    <div className="rounded-[18px] border border-[#EBE6DC] dark:border-[#322E27] bg-white dark:bg-[#221F1B] px-[15px] py-[13px] shadow-[0_1px_2px_rgba(40,36,31,0.03)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.32)]">
      <div className="mb-[6px] text-[11px] text-[#9A958A] dark:text-[#827C70]">{formatEntryDate(entry.timestamp)}</div>
      <p className="font-['Newsreader'] text-[15px] leading-[1.55] text-[#3A372F] dark:text-[#D6D1C6]">{preview}</p>
      {linkedNames.length > 0 && (
        <div className="mt-[9px] flex flex-wrap gap-[6px]">
          {linkedNames.map((name) => (
            <span
              key={name}
              className="rounded-full bg-[#F1ECE2] dark:bg-[#272320] px-[9px] py-[3px] text-[11px] text-[#6F6A60] dark:text-[#A39C8E]"
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function JournalHistory({ entries = [], profiles = [], onEntryPress }) {
  if (entries.length === 0) {
    return (
      <p className="text-center font-['Newsreader'] text-[15px] italic text-[#B6B0A2] dark:text-[#6A645A]">
        Your journal is empty. Start writing.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <div key={entry.id} onClick={() => onEntryPress?.(entry)} role={onEntryPress ? 'button' : undefined}>
          <EntryCard entry={entry} profiles={profiles} />
        </div>
      ))}
    </div>
  );
}
