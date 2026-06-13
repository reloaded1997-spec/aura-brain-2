// =============================================================================
// pages/AcquaintancesPage.jsx — Rhythms & Tasks tab (/rhythms)
// -----------------------------------------------------------------------------
// The routines hub. Create and manage habits here. People and acquaintances
// have moved to the Circle tab (/circle).
//
// Habit data lives in Firestore `habits/{habitId}` via useData(). The streak
// and archive logic is handled entirely by DataContext / db.js — untouched here.
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { BottomNav, NAV_PATHS } from '../components/Navigation';
import { HabitForm } from '../components/CardForms';
import EditCardModal from '../components/EditCardModal';
import { useData } from '../context/DataContext';
import { initialOf } from '../utils/display';

function habitSub(h) {
  if (h.type === 'temporary') return `challenge · ${h.currentStreak || 0}/${h.targetCount || '?'} days`;
  return `permanent · ${h.currentStreak || 0}d streak`;
}

export default function RhythmsPage() {
  const navigate = useNavigate();
  const { habits, addHabit } = useData();
  const [editing, setEditing] = useState(null);

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
        {/* Habit creation form */}
        <div className="rounded-[18px] border border-[#EBE6DC] bg-white p-4 shadow-[0_1px_2px_rgba(40,36,31,0.03)]">
          <HabitForm onSubmit={addHabit} />
        </div>

        {/* Existing habits */}
        {habits.length > 0 && (
          <div className="mt-6">
            <div className="mx-1 mb-2 text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]">
              Daily rhythms
            </div>
            <div className="overflow-hidden rounded-[18px] border border-[#EBE6DC] bg-white">
              {habits.map((h) => (
                <div key={h.id} className="flex items-center border-b border-[#F1ECE2] last:border-b-0">
                  <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#EFEADF] font-['Newsreader'] text-[15px] text-[#6F6A60]">
                      {initialOf(h.title)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-['Newsreader'] text-[15px] text-[#26241F]">{h.title}</span>
                      <span className="block text-[12px] text-[#9A958A]">{habitSub(h)}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing({ type: 'habit', record: h })}
                    aria-label={`Edit ${h.title}`}
                    className="mr-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#9A958A] transition-colors hover:bg-[#F1ECE2] hover:text-[#6F6A60]"
                  >
                    <Pencil className="h-[15px] w-[15px]" strokeWidth={1.8} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {habits.length === 0 && (
          <div className="mt-8 text-center font-['Newsreader'] text-[15px] italic text-[#B6B0A2]">
            No habits yet — add your first rhythm above.
          </div>
        )}

        <div className="h-6" />
      </main>

      {editing && (
        <EditCardModal
          type={editing.type}
          record={editing.record}
          onClose={() => setEditing(null)}
        />
      )}

      <BottomNav active="rhythms" onNavigate={(key) => navigate(NAV_PATHS[key] || '/')} />
    </div>
  );
}
