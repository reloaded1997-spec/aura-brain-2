// =============================================================================
// components/AcquaintanceDetail.jsx — Full-screen acquaintance detail (dumb)
// =============================================================================

import { useState } from 'react';
import { ChevronLeft, Pencil, Plus } from 'lucide-react';

// Firestore Timestamp -> "Jun 9". Mirrors ProfilePage's helper.
function formatUpdateDate(ts) {
  const d = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AcquaintanceDetail({
  acquaintance,
  updates = [],
  connections = [],
  onBack = () => {},
  onEdit = null,
  onAddUpdate = () => {},
  onOpenConnection = () => {},
}) {
  const [draft, setDraft] = useState('');

  if (!acquaintance) return null;

  const { name, descriptor, inQueue, priorityRate, lastClearedDate, initial } = acquaintance;

  function submitUpdate(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddUpdate(text);
    setDraft('');
  }

  return (
    <div className="min-h-full bg-[#FAF8F3] pb-8">
      {/* Header */}
      <div className="px-[22px] pt-14 pb-[18px]">
        <div className="mb-[18px] flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-[6px] text-[13px] text-[#9A958A]"
          >
            <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={2} />
            <span>Back</span>
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-[6px] rounded-full border border-[#E2DCD0] bg-white px-[11px] py-[5px] text-[12px] text-[#6F6A60] transition-colors hover:border-[#D8B98E] hover:text-[#A8845C]"
            >
              <Pencil className="h-[13px] w-[13px]" strokeWidth={1.8} />
              Edit
            </button>
          )}
        </div>

        <div className="flex items-center gap-[15px]">
          <div className="flex h-[62px] w-[62px] flex-shrink-0 items-center justify-center rounded-full bg-[#ECE7DB] font-['Newsreader'] text-[28px] text-[#6F6A60]">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="font-['Newsreader'] text-[29px] leading-[1.05] text-[#1F1D18]">{name}</div>
            {descriptor && <div className="mt-[3px] text-[13px] text-[#6F6A60]">{descriptor}</div>}
          </div>
        </div>

        {/* Pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {inQueue ? (
            <span className="rounded-full border border-[#E2D3BE] bg-[#FBF4E9] px-[11px] py-[5px] text-[11px] font-semibold text-[#A8845C]">
              IN QUEUE · every {priorityRate} days
            </span>
          ) : (
            <span className="rounded-full border border-[#E2DCD0] bg-white px-[11px] py-[5px] text-[11px] text-[#9A958A]">
              Not in queue
            </span>
          )}
          {inQueue && lastClearedDate && (
            <span className="rounded-full border border-[#E2DCD0] bg-white px-[11px] py-[5px] text-[11px] text-[#6F6A60]">
              Last cleared {lastClearedDate}
            </span>
          )}
        </div>
      </div>

      {/* Updates */}
      <div className="px-4 pt-2">
        <div className="mx-1 mb-[9px] text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]">
          Updates
        </div>

        {/* Add update input */}
        <div className="mb-3 overflow-hidden rounded-[20px] border border-[#EBE6DC] bg-white shadow-[0_1px_2px_rgba(40,36,31,0.03)]">
          <form onSubmit={submitUpdate} className="flex items-center gap-3 px-[15px] py-[13px]">
            <span className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-[#D2CBBC] text-[#C3BCAD]">
              <Plus className="h-[13px] w-[13px]" strokeWidth={2} />
            </span>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add an update"
              className="flex-1 bg-transparent font-['Newsreader'] text-[14px] italic text-[#3A372F] placeholder:text-[#B0AB9E] focus:outline-none"
            />
          </form>
        </div>

        {/* Feed */}
        <div className="flex flex-col gap-[2px]">
          {updates.map((entry, i) => {
            const last = i === updates.length - 1;
            return (
              <div key={entry.id} className="flex gap-[13px] px-1 pb-4">
                <div className="flex flex-shrink-0 flex-col items-center">
                  <span className="mt-[5px] h-[9px] w-[9px] rounded-full bg-[#D7CFBF]" />
                  {!last && <span className="mt-[3px] w-px flex-1 bg-[#E6E0D4]" />}
                </div>
                <div>
                  <div className="text-[12px] text-[#9A958A]">{formatUpdateDate(entry.timestamp)}</div>
                  <div className="mt-[5px] text-[14.5px] leading-[1.5] text-[#3A372F]">{entry.text}</div>
                </div>
              </div>
            );
          })}

          {updates.length === 0 && (
            <div className="px-1 py-2 font-['Newsreader'] text-[14px] italic text-[#B6B0A2]">
              No updates yet.
            </div>
          )}
        </div>
      </div>

      {/* Connections */}
      <div className="px-4 pt-4">
        <div className="mx-1 mb-[9px] text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]">
          Connections
        </div>
        {connections.length > 0 ? (
          <div className="overflow-hidden rounded-[18px] border border-[#EBE6DC] bg-white">
            {connections.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpenConnection(c.id)}
                className="flex w-full items-center gap-3 border-b border-[#F1ECE2] px-4 py-3 text-left last:border-b-0"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#EFEADF] font-['Newsreader'] text-[14px] text-[#6F6A60]">
                  {c.initial}
                </span>
                <span className="font-['Newsreader'] text-[15px] text-[#26241F]">{c.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-1 py-2 font-['Newsreader'] text-[14px] italic text-[#B6B0A2]">
            No connections yet.
          </div>
        )}
      </div>
    </div>
  );
}
