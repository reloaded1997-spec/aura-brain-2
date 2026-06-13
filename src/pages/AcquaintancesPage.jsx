// =============================================================================
// pages/AcquaintancesPage.jsx — Rhythms & Tasks tab (/rhythms)
// -----------------------------------------------------------------------------
// The routines hub. Two sub-tabs:
//   Habits — create and manage habits; each row shows its parent goal if linked
//   Goals  — create overarching goals; link habits to goals from the goal detail
//
// Habits live in `habits/{habitId}` (goalId field added for Phase 3).
// Goals live in `goals/{goalId}`. Both are owned per-uid via useData().
// =============================================================================

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Target, Sparkles } from 'lucide-react';
import { BottomNav, NAV_PATHS } from '../components/Navigation';
import { HabitForm, fieldCls, labelCls } from '../components/CardForms';
import EditCardModal from '../components/EditCardModal';
import GoalDetail from '../components/GoalDetail';
import { useData } from '../context/DataContext';
import { initialOf } from '../utils/display';

// ----- Helpers ---------------------------------------------------------------

function habitSub(h) {
  if (h.type === 'temporary') return `challenge · ${h.currentStreak || 0}/${h.targetCount || '?'} days`;
  return `permanent · ${h.currentStreak || 0}d streak`;
}

// Format a YYYY-MM-DD string as "Jun 30, 2026" using local date (no UTC shift).
function formatDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const STATUS_STYLES = {
  active:   { bg: 'bg-[#E8F0E9]', text: 'text-[#4A7A54]', label: 'Active' },
  achieved: { bg: 'bg-[#F5EDD8]', text: 'text-[#8A6A35]', label: 'Achieved' },
  archived: { bg: 'bg-[#EEEAE2]', text: 'text-[#8A8580]', label: 'Archived' },
};

const STATUS_ORDER = { active: 0, achieved: 1, archived: 2 };

// ----- Inline GoalForm -------------------------------------------------------

function GoalForm({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), targetDate: targetDate || null });
    setTitle('');
    setDescription('');
    setTargetDate('');
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className={labelCls}>Title</label>
        <input
          className={fieldCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Read through the whole Bible"
        />
      </div>
      <div>
        <label className={labelCls}>Description (optional)</label>
        <input
          className={fieldCls}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Why this matters to you"
        />
      </div>
      <div>
        <label className={labelCls}>Target date (optional)</label>
        <input
          type="date"
          className={fieldCls}
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#A8845C] py-2.5 font-['Newsreader'] text-[15px] text-white transition-colors hover:bg-[#9a774f]"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Add goal
      </button>
    </form>
  );
}

// ----- Page ------------------------------------------------------------------

export default function RhythmsPage() {
  const navigate = useNavigate();
  const { habits, goals, addHabit, addGoal } = useData();

  // 'habits' | 'goals'
  const [pageTab, setPageTab] = useState('habits');
  const [editingHabit, setEditingHabit] = useState(null);
  const [openGoal, setOpenGoal] = useState(null);

  // Active goals first, then achieved, then archived; newest-first within each group.
  const sortedGoals = useMemo(
    () =>
      [...goals].sort((a, b) => {
        const sDiff = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
        if (sDiff !== 0) return sDiff;
        const aMs = a.createdAt?.toMillis?.() ?? 0;
        const bMs = b.createdAt?.toMillis?.() ?? 0;
        return bMs - aMs;
      }),
    [goals]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F3] text-[#26241F]">
      {/* Header */}
      <div className="px-[22px] pt-14 pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[1.6px] text-[#9A958A]">
          Your rhythms
        </div>
        <div className="mt-[3px] font-['Newsreader'] text-[32px] leading-[1.05] text-[#1F1D18]">
          Habits &amp; tasks
        </div>
      </div>

      <main className="flex-1 px-4">
        {/* Page tab selector: Habits | Goals */}
        <div className="mb-4 flex gap-1 rounded-xl bg-[#EFEAE0] p-1">
          {[
            { key: 'habits', label: 'Habits', Icon: Sparkles },
            { key: 'goals',  label: 'Goals',  Icon: Target  },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPageTab(key)}
              className={`flex flex-1 items-center justify-center gap-[6px] rounded-lg py-2 font-['Newsreader'] text-[14px] transition-all ${
                pageTab === key
                  ? 'border border-[#E6DFD2] bg-white text-[#26241F] shadow-[0_1px_2px_rgba(40,36,31,0.08)]'
                  : 'border border-transparent text-[#9A958A]'
              }`}
            >
              <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>

        {/* ---- Habits tab ---- */}
        {pageTab === 'habits' && (
          <>
            {/* Habit creation form */}
            <div className="rounded-[18px] border border-[#EBE6DC] bg-white p-4 shadow-[0_1px_2px_rgba(40,36,31,0.03)]">
              <HabitForm goals={goals} onSubmit={addHabit} />
            </div>

            {/* Habits list */}
            {habits.length > 0 && (
              <div className="mt-6">
                <div className="mx-1 mb-2 text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]">
                  Daily rhythms
                </div>
                <div className="overflow-hidden rounded-[18px] border border-[#EBE6DC] bg-white">
                  {habits.map((h) => {
                    const parentGoal = h.goalId ? goals.find((g) => g.id === h.goalId) : null;
                    return (
                      <div key={h.id} className="flex items-center border-b border-[#F1ECE2] last:border-b-0">
                        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#EFEADF] font-['Newsreader'] text-[15px] text-[#6F6A60]">
                            {initialOf(h.title)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-['Newsreader'] text-[15px] text-[#26241F]">{h.title}</span>
                            <span className="block text-[12px] text-[#9A958A]">{habitSub(h)}</span>
                            {parentGoal && (
                              <span className="mt-0.5 flex items-center gap-1 text-[11px] text-[#A8845C]">
                                <Target className="h-[10px] w-[10px] flex-shrink-0" strokeWidth={1.8} />
                                <span className="truncate">{parentGoal.title}</span>
                              </span>
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingHabit(h)}
                          aria-label={`Edit ${h.title}`}
                          className="mr-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#9A958A] transition-colors hover:bg-[#F1ECE2] hover:text-[#6F6A60]"
                        >
                          <Pencil className="h-[15px] w-[15px]" strokeWidth={1.8} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {habits.length === 0 && (
              <div className="mt-8 text-center font-['Newsreader'] text-[15px] italic text-[#B6B0A2]">
                No habits yet — add your first rhythm above.
              </div>
            )}
          </>
        )}

        {/* ---- Goals tab ---- */}
        {pageTab === 'goals' && (
          <>
            {/* Goal creation form */}
            <div className="rounded-[18px] border border-[#EBE6DC] bg-white p-4 shadow-[0_1px_2px_rgba(40,36,31,0.03)]">
              <GoalForm onSubmit={addGoal} />
            </div>

            {/* Goals list */}
            {sortedGoals.length > 0 && (
              <div className="mt-6 flex flex-col gap-3">
                <div className="mx-1 text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]">
                  Your goals
                </div>
                {sortedGoals.map((goal) => {
                  const linkedCount = habits.filter((h) => h.goalId === goal.id).length;
                  const style = STATUS_STYLES[goal.status] ?? STATUS_STYLES.active;
                  const dateLabel = formatDate(goal.targetDate);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setOpenGoal(goal)}
                      className="w-full rounded-[18px] border border-[#EBE6DC] bg-white p-4 text-left shadow-[0_1px_2px_rgba(40,36,31,0.03)] transition-colors hover:bg-[#FAF6EF]"
                    >
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-['Newsreader'] text-[17px] leading-snug text-[#1F1D18]">
                          {goal.title}
                        </span>
                        <span
                          className={`mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}
                        >
                          {style.label}
                        </span>
                      </div>

                      {/* Description */}
                      {goal.description ? (
                        <p className="mt-1 font-['Newsreader'] text-[13px] italic text-[#9A958A]">
                          {goal.description}
                        </p>
                      ) : null}

                      {/* Meta row */}
                      <div className="mt-2 flex items-center gap-3 text-[12px] text-[#A8A294]">
                        {dateLabel && (
                          <span>Target: {dateLabel}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-[11px] w-[11px]" strokeWidth={1.8} />
                          {linkedCount === 0
                            ? 'No habits linked'
                            : `${linkedCount} habit${linkedCount === 1 ? '' : 's'} feeding this`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {sortedGoals.length === 0 && (
              <div className="mt-8 text-center font-['Newsreader'] text-[15px] italic text-[#B6B0A2]">
                No goals yet — add your first above.
              </div>
            )}
          </>
        )}

        <div className="h-6" />
      </main>

      {/* Habit edit modal */}
      {editingHabit && (
        <EditCardModal
          type="habit"
          record={editingHabit}
          onClose={() => setEditingHabit(null)}
        />
      )}

      {/* Goal detail/edit modal */}
      {openGoal && (
        <GoalDetail
          goal={openGoal}
          habits={habits}
          onClose={() => setOpenGoal(null)}
        />
      )}

      <BottomNav active="rhythms" onNavigate={(key) => navigate(NAV_PATHS[key] || '/')} />
    </div>
  );
}
