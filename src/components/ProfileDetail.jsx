// =============================================================================
// components/ProfileDetail.jsx — Full-screen profile detail (Phase 3, dumb)
// -----------------------------------------------------------------------------
// The CRM heart (design §03): a person's avatar + cadence pills, their checkable
// Active Requests, and an append-only Relational Log timeline. Notes routed in
// from the journal carry a quiet "From Journal" tag (§6).
//
// Purely presentational — every piece of data and every action arrives via
// props. No Firebase, no router.
//
// Props:
//   profile         : { name, initial, kind, role/sub, priorityLabel,
//                       priorityRate?, lastPrayedLabel? }
//   requests        : [{ id, text, isCompleted }]
//   logs            : [{ id, date, text, fromJournal }]
//   onBack          : () => void
//   onToggleRequest : (requestId) => void
//   onAddRequest    : (text) => void
// =============================================================================

import { useState } from 'react';
import { ChevronLeft, Check, Plus, Pencil } from 'lucide-react';

export default function ProfileDetail({
  profile,
  requests = [],
  logs = [],
  onBack = () => {},
  onToggleRequest = () => {},
  onAddRequest = () => {},
  onEdit = null,
}) {
  const [draft, setDraft] = useState('');
  const isGroup = profile?.kind === 'group';
  const role = profile?.role || profile?.sub;

  const cycle = profile?.priorityRate ? `every ${profile.priorityRate} days` : null;
  const priorityPill =
    profile?.priorityLabel && cycle
      ? `${profile.priorityLabel.toUpperCase()} · ${cycle}`
      : profile?.priorityLabel?.toUpperCase() || null;

  function submitRequest(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddRequest(text);
    setDraft('');
  }

  return (
    <div className="min-h-full bg-[#FAF8F3] pb-8">
      {/* ---- Header ---- */}
      <div className="px-[22px] pt-14 pb-[18px]">
        <div className="mb-[18px] flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-[6px] text-[13px] text-[#9A958A]"
          >
            <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={2} />
            <span>Queue</span>
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
          <div
            className={`flex h-[62px] w-[62px] flex-shrink-0 items-center justify-center bg-[#ECE7DB] font-['Newsreader'] text-[28px] text-[#6F6A60] ${
              isGroup ? 'rounded-[15px]' : 'rounded-full'
            }`}
          >
            {profile?.initial}
          </div>
          <div className="min-w-0">
            <div className="font-['Newsreader'] text-[29px] leading-[1.05] text-[#1F1D18]">
              {profile?.name}
            </div>
            {role && <div className="mt-[3px] text-[13px] text-[#6F6A60]">{role}</div>}
          </div>
        </div>

        {/* Cadence pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {priorityPill && (
            <span className="rounded-full border border-[#E2D3BE] bg-[#FBF4E9] px-[11px] py-[5px] text-[11px] font-semibold text-[#A8845C]">
              {priorityPill}
            </span>
          )}
          {profile?.lastPrayedLabel && (
            <span className="rounded-full border border-[#E2DCD0] bg-white px-[11px] py-[5px] text-[11px] text-[#6F6A60]">
              {profile.lastPrayedLabel}
            </span>
          )}
        </div>
      </div>

      {/* ---- Active requests ---- */}
      <div className="px-4">
        <div className="mx-1 mb-[9px] text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]">
          Active requests
        </div>
        <div className="overflow-hidden rounded-[20px] border border-[#EBE6DC] bg-white shadow-[0_1px_2px_rgba(40,36,31,0.03)]">
          {requests.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onToggleRequest(r.id)}
              className="flex w-full items-start gap-3 border-b border-[#F1ECE2] px-[15px] py-[14px] text-left"
            >
              <span
                className={`mt-[1px] flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-150 ${
                  r.isCompleted ? 'border-[#5F7F67] bg-[#5F7F67]' : 'border-[#D2CBBC] bg-transparent'
                }`}
              >
                {r.isCompleted && <Check className="h-3 w-3 text-white" strokeWidth={2.6} />}
              </span>
              <span
                className={`flex-1 pt-[1px] text-[14.5px] leading-[1.4] ${
                  r.isCompleted ? 'text-[#9A958A] line-through' : 'text-[#3A372F]'
                }`}
              >
                {r.text}
              </span>
            </button>
          ))}

          {/* Add a request */}
          <form onSubmit={submitRequest} className="flex items-center gap-3 px-[15px] py-[13px]">
            <span className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-[#D2CBBC] text-[#C3BCAD]">
              <Plus className="h-[13px] w-[13px]" strokeWidth={2} />
            </span>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a request"
              className="flex-1 bg-transparent font-['Newsreader'] text-[14px] italic text-[#3A372F] placeholder:text-[#B0AB9E] focus:outline-none"
            />
          </form>
        </div>
      </div>

      {/* ---- Relational log ---- */}
      <div className="px-4 pt-6">
        <div className="mx-1 mb-3 text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]">
          Relational log
        </div>
        <div className="flex flex-col gap-[2px]">
          {logs.map((entry, i) => {
            const last = i === logs.length - 1;
            return (
              <div key={entry.id} className="flex gap-[13px] px-1 pb-4">
                {/* Timeline rail */}
                <div className="flex flex-shrink-0 flex-col items-center">
                  <span
                    className={`mt-[5px] h-[9px] w-[9px] rounded-full ${
                      entry.fromJournal ? 'bg-[#5F7F67]' : 'bg-[#D7CFBF]'
                    }`}
                  />
                  {!last && <span className="mt-[3px] w-px flex-1 bg-[#E6E0D4]" />}
                </div>
                {/* Entry body */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#9A958A]">{entry.date}</span>
                    {entry.fromJournal && (
                      <span className="rounded-full bg-[#EEF3EC] px-2 py-[2px] text-[10px] font-semibold tracking-[0.3px] text-[#5F7F67]">
                        FROM JOURNAL
                      </span>
                    )}
                  </div>
                  <div className="mt-[5px] text-[14.5px] leading-[1.5] text-[#3A372F]">
                    {entry.text}
                  </div>
                </div>
              </div>
            );
          })}

          {logs.length === 0 && (
            <div className="px-1 py-2 font-['Newsreader'] text-[14px] italic text-[#B6B0A2]">
              No history yet — your first note will land here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
