// =============================================================================
// components/JournalCapture.jsx — Journal capture screen (Phase 3, dumb)
// -----------------------------------------------------------------------------
// The system's one front door (design §05). You write the night freely; Aura
// surfaces the people/groups you named and the prayer requests it heard. You
// confirm or dismiss each suggestion, then "Save & route".
//
// Presentational: detection toggles and the compose text live in LOCAL UI
// state; the actual recognition is mocked via props (in production it comes
// from the Cloud Function / Anthropic pipeline, §6). Optional onSave/onCancel
// callbacks let a parent wire navigation.
//
// Props:
//   draft   : { text, subjectName, subjectFullName, detected[], entities[] }
//   onSave  : (payload) => void   — fired when the user routes the entry.
//   onCancel: () => void
// =============================================================================

import { useState } from 'react';
import { Sparkles, Check, Plus } from 'lucide-react';

function nowStamp() {
  const d = new Date();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${weekday} · ${time}`;
}

export default function JournalCapture({ draft, onSave = () => {}, onCancel = () => {} }) {
  const {
    text: initialText = '',
    subjectName = 'them',
    subjectFullName = '',
    detected: initialDetected = [],
    entities = [],
  } = draft || {};

  const [text, setText] = useState(initialText);
  const [detected, setDetected] = useState(initialDetected);
  const [saved, setSaved] = useState(false);

  const confirmedCount = detected.filter((d) => d.confirmed).length;
  const saveLabel =
    confirmedCount > 0
      ? `Save & route · ${confirmedCount} ${confirmedCount === 1 ? 'request' : 'requests'}`
      : 'Save & route · log only';

  function toggleDetected(id) {
    setDetected((ds) => ds.map((d) => (d.id === id ? { ...d, confirmed: !d.confirmed } : d)));
  }

  function handleSave() {
    setSaved(true);
    onSave({
      text,
      confirmedRequests: detected.filter((d) => d.confirmed),
      entities,
    });
  }

  return (
    <div className="flex min-h-full flex-col bg-[#FAF8F3] pb-8">
      {/* ---- Header ---- */}
      <div className="px-[22px] pt-14 pb-4">
        <div className="mb-4 flex items-center justify-between text-[13px] text-[#9A958A]">
          <button type="button" onClick={onCancel} className="hover:text-[#6F6A60]">
            Cancel
          </button>
          <span className="text-[11px] font-semibold uppercase tracking-[1.4px]">Journal</span>
          <span className="opacity-0">Cancel</span>
        </div>
        <div className="font-['Newsreader'] text-[32px] leading-[1.05] text-[#1F1D18]">
          {saved ? 'Saved' : 'New entry'}
        </div>
        <div className="mt-[3px] text-[12px] text-[#9A958A]">{nowStamp()}</div>
      </div>

      {saved ? (
        /* ================= Saved & routed confirmation ================= */
        <div className="flex flex-col items-center px-7 pt-[30px] text-center">
          <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full border border-[#CADBCB] bg-[#EEF3EC]">
            <Check className="h-7 w-7 text-[#5F7F67]" strokeWidth={2.4} />
          </div>
          <div className="mt-4 font-['Newsreader'] text-[25px] text-[#1F1D18]">Saved &amp; routed</div>
          <div className="mt-[6px] max-w-[250px] text-[14px] leading-[1.5] text-[#6F6A60]">
            Your note is now part of the relationships you named.
          </div>

          {/* Summary card */}
          <div className="mt-[22px] w-full overflow-hidden rounded-[18px] border border-[#EBE6DC] bg-white text-left shadow-[0_1px_2px_rgba(40,36,31,0.03)]">
            {confirmedCount > 0 && (
              <div className="flex items-center gap-[11px] border-b border-[#F1ECE2] px-[15px] py-[13px]">
                <span className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-[#A8845C]" />
                <span className="text-[14px] text-[#3A372F]">
                  {confirmedCount} {confirmedCount === 1 ? 'request' : 'requests'} added to{' '}
                  <span className="font-semibold">{subjectFullName}</span>
                </span>
              </div>
            )}
            {entities.map((ent, i) => (
              <div
                key={ent.id}
                className={`flex items-center gap-[11px] px-[15px] py-[13px] ${
                  i < entities.length - 1 ? 'border-b border-[#F1ECE2]' : ''
                }`}
              >
                <span className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-[#5F7F67]" />
                <span className="text-[14px] text-[#3A372F]">
                  Logged to <span className="font-semibold">{ent.name}</span>
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSaved(false)}
            className="mt-[22px] font-['Newsreader'] text-[15px] italic text-[#A8845C]"
          >
            Write another
          </button>
        </div>
      ) : (
        /* ================= Compose + detection ================= */
        <div className="block">
          {/* Compose paper */}
          <div className="px-4">
            <div className="rounded-[20px] border border-[#EBE6DC] bg-white p-[17px] shadow-[0_1px_2px_rgba(40,36,31,0.03)]">
              <div className="mb-[11px] text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]">
                Tonight&apos;s entry
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="Write the night as it happened…"
                className="w-full resize-none bg-transparent font-['Source_Serif_4'] text-[16px] leading-[1.65] text-[#3A372F] placeholder:text-[#B0AB9E] focus:outline-none"
              />
            </div>
          </div>

          {/* Detection */}
          <div className="px-4 pt-4">
            <div className="rounded-[18px] border border-[#EAE3D6] bg-[#F4F0E8] px-[15px] py-[14px]">
              <div className="mb-[13px] flex items-center gap-2">
                <Sparkles className="h-[14px] w-[14px] text-[#A8845C]" strokeWidth={1.4} />
                <span className="font-['Newsreader'] text-[15px] text-[#26241F]">Aura noticed</span>
              </div>

              {/* Prayer request suggestions */}
              <div className="mb-[9px] text-[10px] font-semibold uppercase tracking-[1.4px] text-[#9A958A]">
                Prayer requests · for {subjectName}
              </div>
              <div className="flex flex-col gap-2">
                {detected.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDetected(d.id)}
                    className={`flex items-center gap-[10px] rounded-[13px] border px-3 py-[10px] text-left transition-all duration-150 ${
                      d.confirmed ? 'border-[#CADBCB] bg-[#EEF3EC]' : 'border-[#E6E0D5] bg-white'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                        d.confirmed ? 'bg-[#5F7F67]' : 'border-[1.5px] border-[#D2CBBC]'
                      }`}
                    >
                      {d.confirmed ? (
                        <Check className="h-[11px] w-[11px] text-white" strokeWidth={3} />
                      ) : (
                        <Plus className="h-[12px] w-[12px] text-[#C3BCAD]" strokeWidth={2} />
                      )}
                    </span>
                    <span
                      className={`flex-1 text-[14px] leading-[1.35] ${
                        d.confirmed ? 'text-[#3A372F]' : 'text-[#6F6A60]'
                      }`}
                    >
                      {d.text}
                    </span>
                  </button>
                ))}
              </div>

              {/* Routing entities */}
              <div className="mb-[9px] mt-[15px] text-[10px] font-semibold uppercase tracking-[1.4px] text-[#9A958A]">
                Logging this note to
              </div>
              <div className="flex flex-wrap gap-2">
                {entities.map((ent) => (
                  <span
                    key={ent.id}
                    className="inline-flex items-center gap-2 rounded-full border border-[#E6DFD2] bg-white py-[5px] pl-[6px] pr-3"
                  >
                    <span
                      className={`flex h-[22px] w-[22px] items-center justify-center bg-[#ECE7DB] font-['Newsreader'] text-[12px] text-[#6F6A60] ${
                        ent.kind === 'group' ? 'rounded-[7px]' : 'rounded-full'
                      }`}
                    >
                      {ent.initial}
                    </span>
                    <span className="font-['Newsreader'] text-[14px] text-[#26241F]">{ent.name}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="px-4 pt-[18px]">
            <button
              type="button"
              onClick={handleSave}
              className="w-full rounded-[15px] bg-[#A8845C] py-[14px] text-center font-['Newsreader'] text-[16px] text-white shadow-[0_2px_6px_rgba(168,132,92,0.25)] transition-colors hover:bg-[#9a774f]"
            >
              {saveLabel}
            </button>
            <div className="mt-[10px] text-center font-['Newsreader'] text-[12px] italic text-[#A39E92]">
              Nothing reaches a profile without your nod.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
