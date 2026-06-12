// =============================================================================
// components/GroupAccordion.jsx — Group queue item (Phase 3, dumb)
// -----------------------------------------------------------------------------
// A group surfaces in the queue as a single header row that can expand inline
// to its members (ARCHITECTURE.md §5):
//   - Clicking the group TEXT toggles the nested member list.
//   - The master check circle clears the WHOLE group at once (in real life this
//     stamps lastClearedDate=today on every nested profile). Here it animates
//     the card collapse and calls onCompleteGroup(id).
//   - "Check off the whole group" button = the same batch action from inside.
//   - Individual member circles toggle locally (visual only in Phase 3).
//
// Props:
//   group          : { id, name, sub, initial, priorityLabel?, priorityRate? }
//   nestedProfiles : array of member profiles ({ id, name, sub, initial })
//   onCompleteGroup: (groupId) => void   — after the collapse transition ends.
//   defaultOpen    : boolean (default false)
// =============================================================================

import { useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function GroupAccordion({
  group,
  nestedProfiles = [],
  onCompleteGroup = () => {},
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [groupDone, setGroupDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [memberDone, setMemberDone] = useState({}); // id -> bool
  const firedRef = useRef(false);

  const subLabel = groupDone
    ? `all ${nestedProfiles.length} logged today`
    : group.sub || `${nestedProfiles.length} people`;

  function completeGroup() {
    if (leaving) return;
    setGroupDone(true);
    setMemberDone(Object.fromEntries(nestedProfiles.map((m) => [m.id, true])));
    setTimeout(() => setLeaving(true), 160);
  }

  function toggleMember(id) {
    setMemberDone((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleTransitionEnd(e) {
    if (e.propertyName !== 'max-height' || !leaving || firedRef.current) return;
    firedRef.current = true;
    onCompleteGroup(group.id);
  }

  return (
    <div
      onTransitionEnd={handleTransitionEnd}
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        leaving ? 'max-h-0 opacity-0 mb-0' : 'max-h-[700px] opacity-100 mb-[9px]'
      }`}
    >
      <div className="overflow-hidden rounded-[18px] border border-[#EBE6DC] bg-white shadow-[0_1px_2px_rgba(40,36,31,0.03)]">
        {/* Header row */}
        <div className="flex items-center gap-3 px-[14px] py-[13px]">
          {/* Master check circle */}
          <button
            type="button"
            onClick={completeGroup}
            aria-label={`Clear the whole ${group.name} group`}
            className="flex-shrink-0"
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] transition-all duration-150 ${
                groupDone ? 'border-[#5F7F67] bg-[#5F7F67]' : 'border-[#D2CBBC] bg-transparent'
              }`}
            >
              {groupDone && <Check className="h-[13px] w-[13px] text-white" strokeWidth={2.6} />}
            </span>
          </button>

          {/* Group avatar (rounded square) */}
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[11px] bg-[#ECE7DB] font-['Newsreader'] text-[18px] text-[#6F6A60]">
            {group.initial}
          </div>

          {/* Name + sub — clicking expands */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="min-w-0 flex-1 text-left"
          >
            <div className="font-['Newsreader'] text-[17px] text-[#26241F]">{group.name}</div>
            <div className="mt-[2px] text-[12.5px] text-[#6F6A60]">{subLabel}</div>
          </button>

          {/* Chevron */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Collapse group' : 'Expand group'}
            className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center"
          >
            <ChevronDown
              className={`h-[14px] w-[14px] text-[#9A958A] transition-transform duration-200 ${
                open ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </button>
        </div>

        {/* Expanded members */}
        {open && (
          <div className="border-t border-[#F1ECE2] bg-[#FCFBF8] py-1">
            {nestedProfiles.map((m) => {
              const mDone = !!memberDone[m.id];
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className="flex w-full items-center gap-[11px] py-[10px] pl-[18px] pr-[14px] text-left"
                >
                  <span
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-150 ${
                      mDone ? 'border-[#5F7F67] bg-[#5F7F67]' : 'border-[#D2CBBC] bg-transparent'
                    }`}
                  >
                    {mDone && <Check className="h-[11px] w-[11px] text-white" strokeWidth={2.8} />}
                  </span>
                  <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#EFEADF] font-['Newsreader'] text-[14px] text-[#6F6A60]">
                    {m.initial}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block font-['Newsreader'] text-[14px] ${
                        mDone ? 'text-[#9A958A] line-through' : 'text-[#26241F]'
                      }`}
                    >
                      {m.name}
                    </span>
                    {m.sub && (
                      <span className="mt-[1px] block text-[11.5px] text-[#A39E92]">{m.sub}</span>
                    )}
                  </span>
                </button>
              );
            })}

            {/* Batch action */}
            <div className="px-[14px] pb-3 pt-2">
              <button
                type="button"
                onClick={completeGroup}
                className="w-full rounded-xl border border-[#CADBCB] bg-[#EEF3EC] py-[10px] text-center font-['Newsreader'] text-[14px] text-[#5F7F67]"
              >
                Check off the whole group
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
