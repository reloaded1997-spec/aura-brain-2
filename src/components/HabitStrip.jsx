// =============================================================================
// components/HabitStrip.jsx — Daily rhythm strip (Phase 3, dumb)
// =============================================================================

import { Check } from 'lucide-react';

export default function HabitStrip({ habits = [], onCheck = () => {} }) {
  const chips = habits.filter((h) => h.type !== 'temporary');
  const challenges = habits.filter((h) => h.type === 'temporary');

  const orderedChips = [...chips].sort((a, b) => Number(a.done) - Number(b.done));
  const doneCount = chips.filter((h) => h.done).length;

  return (
    <section className="bg-[#F4F0E8] dark:bg-[#1E1B16] border-y border-[#EAE3D6] dark:border-[#2A2620] px-[18px] pt-[13px] pb-4">
      {/* Section label */}
      <div className="flex items-center justify-between mb-[11px]">
        <span className="text-[10px] font-semibold tracking-[1.8px] text-[#9A958A] dark:text-[#827C70] uppercase">
          Daily rhythm
        </span>
        <span className="text-[11px] text-[#9A958A] dark:text-[#827C70]">
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
                ? 'border-[#CADBCB] dark:border-[#33473A] bg-[#EEF3EC] dark:bg-[#1B2620] opacity-50'
                : 'border-[#E6E0D5] dark:border-[#302C25] bg-white dark:bg-[#221F1B] opacity-100'
            }`}
          >
            <span
              className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${
                h.done
                  ? 'bg-[#5F7F67] dark:bg-[#80A789]'
                  : 'border-[1.5px] border-[#D2CBBC] dark:border-[#46413A]'
              }`}
            >
              {h.done && <Check className="h-[11px] w-[11px] text-white" strokeWidth={3} />}
            </span>
            <span
              className={`font-['Newsreader'] text-[14px] whitespace-nowrap ${
                h.done ? 'text-[#3E5A45] dark:text-[#A7C9AD]' : 'text-[#26241F] dark:text-[#ECE7DD]'
              }`}
            >
              {h.title}
            </span>
            <span className={`text-[11px] ${h.done ? 'text-[#5F7F67] dark:text-[#80A789]' : 'text-[#A8845C] dark:text-[#C49A6C]'}`}>
              {h.currentStreak}d
            </span>
          </button>
        ))}
      </div>

      {/* Time-boxed challenge card(s) */}
      {challenges.map((c) => {
        const pct = c.targetCount
          ? Math.min(100, Math.round((c.currentStreak / c.targetCount) * 100))
          : 0;
        return (
          <div
            key={c.id}
            className={`mt-[9px] rounded-[13px] border bg-white dark:bg-[#221F1B] px-3 py-[10px] transition-all duration-300 ${
              c.done
                ? 'border-[#CADBCB] dark:border-[#33473A]'
                : 'border-[#E6DFD2] dark:border-[#302C25]'
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
                    c.done
                      ? 'bg-[#5F7F67] dark:bg-[#80A789]'
                      : 'border-[1.5px] border-[#D2CBBC] dark:border-[#46413A]'
                  }`}
                >
                  {c.done && <Check className="h-[11px] w-[11px] text-white" strokeWidth={3} />}
                </span>
              </button>
              <span className="min-w-0 flex-1 truncate font-['Newsreader'] text-[14px] text-[#26241F] dark:text-[#ECE7DD]">
                {c.title}
              </span>
              <span className="text-[10px] font-semibold tracking-[0.8px] text-[#A8845C] dark:text-[#C49A6C] uppercase whitespace-nowrap">
                {c.targetCount}-day · {c.currentStreak} done
              </span>
            </div>
            <div className="mt-[7px] h-[5px] rounded-full bg-[#EFE9DD] dark:bg-[#2A261E] overflow-hidden">
              <div
                className="h-full bg-[#A8845C] dark:bg-[#C49A6C] rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}
