// =============================================================================
// components/HabitStrip.jsx — Daily rhythm strip (Phase 3, dumb)
// -----------------------------------------------------------------------------
// Horizontal, scrollable chip strip (ARCHITECTURE.md §5):
//   - `flex overflow-x-auto` so chips scroll sideways on a phone.
//   - Checked chips drop to 50% opacity AND move to the back of the list.
//   - Time-boxed "challenge" habits (type: 'temporary') render below as a
//     progress card rather than a chip.
//
// Props:
//   habits  : array of { id, title, type, currentStreak, targetCount?, done }
//   onCheck : (id) => void   — parent flips `done`; the visual reorder/fade
//                              follows from the new prop value.
// =============================================================================

import { Check } from 'lucide-react';

export default function HabitStrip({ habits = [], onCheck = () => {} }) {
  // Permanent habits become chips; temporary ones become challenge cards.
  const chips = habits.filter((h) => h.type !== 'temporary');
  const challenges = habits.filter((h) => h.type === 'temporary');

  // Done chips sink to the back; original order preserved within each bucket.
  const orderedChips = [...chips].sort((a, b) => Number(a.done) - Number(b.done));
  const doneCount = chips.filter((h) => h.done).length;

  return (
    <section className="bg-[#F4F0E8] border-y border-[#EAE3D6] px-[18px] pt-[13px] pb-4">
      {/* Section label */}
      <div className="flex items-center justify-between mb-[11px]">
        <span className="text-[10px] font-semibold tracking-[1.8px] text-[#9A958A] uppercase">
          Daily rhythm
        </span>
        <span className="text-[11px] text-[#9A958A]">
          {doneCount} / {chips.length}
        </span>
      </div>

      {/* Scrollable chip strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-[18px] px-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {orderedChips.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => onCheck(h.id)}
            className={`inline-flex flex-shrink-0 items-center gap-[7px] rounded-[13px] border py-[7px] pl-2 pr-[11px] transition-all duration-300 ${
              h.done
                ? 'border-[#CADBCB] bg-[#EEF3EC] opacity-50'
                : 'border-[#E6E0D5] bg-white opacity-100'
            }`}
          >
            <span
              className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${
                h.done ? 'bg-[#5F7F67]' : 'border-[1.5px] border-[#D2CBBC]'
              }`}
            >
              {h.done && <Check className="h-[11px] w-[11px] text-white" strokeWidth={3} />}
            </span>
            <span
              className={`font-['Newsreader'] text-[14px] whitespace-nowrap ${
                h.done ? 'text-[#3E5A45]' : 'text-[#26241F]'
              }`}
            >
              {h.title}
            </span>
            <span className={`text-[11px] ${h.done ? 'text-[#5F7F67]' : 'text-[#A8845C]'}`}>
              {h.currentStreak}d
            </span>
          </button>
        ))}
      </div>

      {/* Time-boxed challenge card(s) — the check circle marks today done */}
      {challenges.map((c) => {
        const pct = c.targetCount
          ? Math.min(100, Math.round((c.currentStreak / c.targetCount) * 100))
          : 0;
        return (
          <div
            key={c.id}
            className={`mt-[9px] rounded-[13px] border bg-white px-3 py-[10px] transition-all duration-300 ${
              c.done ? 'border-[#CADBCB]' : 'border-[#E6DFD2]'
            }`}
          >
            <div className="flex items-center gap-[10px]">
              <button
                type="button"
                onClick={() => onCheck(c.id)}
                aria-label={`Mark ${c.title} done today`}
                className="flex-shrink-0"
              >
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${
                    c.done ? 'bg-[#5F7F67]' : 'border-[1.5px] border-[#D2CBBC]'
                  }`}
                >
                  {c.done && <Check className="h-[11px] w-[11px] text-white" strokeWidth={3} />}
                </span>
              </button>
              <span className="min-w-0 flex-1 truncate font-['Newsreader'] text-[14px] text-[#26241F]">
                {c.title}
              </span>
              <span className="text-[10px] font-semibold tracking-[0.8px] text-[#A8845C] uppercase whitespace-nowrap">
                {c.targetCount}-day · {c.currentStreak} done
              </span>
            </div>
            <div className="mt-[7px] h-[5px] rounded-full bg-[#EFE9DD] overflow-hidden">
              <div
                className="h-full bg-[#A8845C] rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}
