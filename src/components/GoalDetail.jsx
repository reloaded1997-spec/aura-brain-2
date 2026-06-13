// =============================================================================
// components/GoalDetail.jsx — Goal edit + habit-linking modal
// -----------------------------------------------------------------------------
// Full-screen overlay sheet. Two modes via local state:
//   edit mode    — edit title/description/targetDate/status; habit checkboxes
//                  link/unlink habits immediately (optimistic Firestore write)
//   confirm mode — delete confirmation step
//
// Habit links are saved on checkbox change (immediate write). Goal field edits
// (title, description, targetDate, status) are saved via the Save button.
// On goal delete, all linked habits are unlinked first so no dangling goalIds.
// =============================================================================

import { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { fieldCls, labelCls } from './CardForms';

function formatTargetDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function GoalDetail({ goal, habits, onClose }) {
  const { updateGoal, deleteGoal, updateHabit } = useData();

  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description || '');
  const [targetDate, setTargetDate] = useState(goal.targetDate || '');
  const [status, setStatus] = useState(goal.status);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  function handleSave(e) {
    e.preventDefault();
    if (!title.trim()) return;
    updateGoal(goal.id, {
      title: title.trim(),
      description: description.trim(),
      targetDate: targetDate || null,
      status,
    });
    onClose();
  }

  async function handleDelete() {
    setBusy(true);
    try {
      // Unlink all habits before removing the goal so no dangling goalIds remain.
      const linked = habits.filter((h) => h.goalId === goal.id);
      await Promise.all(linked.map((h) => updateHabit(h.id, { goalId: null })));
      await deleteGoal(goal.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  function toggleHabitLink(habit) {
    const nextGoalId = habit.goalId === goal.id ? null : goal.id;
    updateHabit(habit.id, { goalId: nextGoalId });
  }

  const linkedCount = habits.filter((h) => h.goalId === goal.id).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-4 pt-20 sm:items-center sm:pb-0"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-md overflow-y-auto rounded-[20px] border border-[#EBE6DC] bg-white p-4 shadow-[0_8px_30px_rgba(40,36,31,0.18)]"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {confirming ? (
          /* ---- Delete confirmation ---------------------------------------- */
          <div>
            <div className="mb-3 flex items-start gap-3">
              <span className="mt-[2px] flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#FBEDEA] text-[#B4502F]">
                <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </span>
              <div>
                <div className="font-['Newsreader'] text-[20px] leading-tight text-[#1F1D18]">
                  Delete goal?
                </div>
                <p className="mt-[6px] text-[13.5px] leading-[1.45] text-[#6F6A60]">
                  "{goal.title}" will be permanently removed.{' '}
                  {linkedCount > 0 && `Its ${linkedCount} linked habit${linkedCount === 1 ? '' : 's'} will be kept but unlinked. `}
                  This can't be undone.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="flex-1 rounded-lg border border-[#E2DCD0] bg-white py-2.5 font-['Newsreader'] text-[15px] text-[#6F6A60] transition-colors hover:bg-[#F7F3EC] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#B4502F] py-2.5 font-['Newsreader'] text-[15px] text-white transition-colors hover:bg-[#9f4528] disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          /* ---- Edit form -------------------------------------------------- */
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div className="mb-1 flex items-center justify-between">
              <div className="font-['Newsreader'] text-[20px] text-[#1F1D18]">Edit goal</div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#9A958A] hover:bg-[#F1ECE2]"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={2} />
              </button>
            </div>

            <div>
              <label className={labelCls}>Title</label>
              <input
                className={fieldCls}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Goal title"
              />
            </div>

            <div>
              <label className={labelCls}>Description (optional)</label>
              <input
                className={fieldCls}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Why this matters"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelCls}>Target date (optional)</label>
                <input
                  type="date"
                  className={fieldCls}
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className={labelCls}>Status</label>
                <select
                  className={fieldCls}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="achieved">Achieved</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Habit linking */}
            <div className="mt-1">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[1px] text-[#9A958A]">
                Habits feeding this goal{linkedCount > 0 ? ` · ${linkedCount}` : ''}
              </div>
              {habits.length === 0 ? (
                <p className="font-['Newsreader'] text-[14px] italic text-[#B6B0A2]">
                  No habits yet — add some from the Habits tab.
                </p>
              ) : (
                <div className="flex max-h-44 flex-col gap-0.5 overflow-y-auto rounded-lg border border-[#E2DCD0] bg-white px-3 py-2">
                  {habits.map((h) => {
                    const isLinkedHere = h.goalId === goal.id;
                    const isLinkedElsewhere = h.goalId && h.goalId !== goal.id;
                    return (
                      <label key={h.id} className="flex cursor-pointer items-center gap-2 py-[3px]">
                        <input
                          type="checkbox"
                          checked={isLinkedHere}
                          onChange={() => toggleHabitLink(h)}
                          className="h-4 w-4 accent-[#A8845C]"
                        />
                        <span className="flex-1 text-[13px] text-[#26241F]">{h.title}</span>
                        {isLinkedElsewhere && (
                          <span className="text-[11px] italic text-[#A8A294]">other goal</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#A8845C] py-2.5 font-['Newsreader'] text-[15px] text-white transition-colors hover:bg-[#9a774f]"
            >
              Save changes
            </button>

            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#EBD9D2] bg-white py-2 text-[13px] font-semibold text-[#B4502F] transition-colors hover:bg-[#FBEDEA]"
            >
              <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.9} />
              Delete goal
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
