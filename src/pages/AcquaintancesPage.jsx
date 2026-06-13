// =============================================================================
// pages/AcquaintancesPage.jsx — Acquaintances list (5th tab)
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { BottomNav, NAV_PATHS } from '../components/Navigation';
import { AcquaintanceForm } from '../components/CardForms';
import EditCardModal from '../components/EditCardModal';
import { useData } from '../context/DataContext';
import { initialOf } from '../utils/display';

export default function AcquaintancesPage() {
  const navigate = useNavigate();
  const { acquaintances, profiles, addAcquaintance } = useData();
  const [editing, setEditing] = useState(null);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F3] text-[#26241F]">
      {/* Header */}
      <div className="px-[22px] pt-14 pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[1.6px] text-[#9A958A]">
          Your circle
        </div>
        <div className="mt-[3px] font-['Newsreader'] text-[32px] leading-[1.05] text-[#1F1D18]">
          Acquaintances
        </div>
      </div>

      <main className="flex-1 px-4">
        {/* Create form */}
        <div className="rounded-[18px] border border-[#EBE6DC] bg-white p-4 shadow-[0_1px_2px_rgba(40,36,31,0.03)]">
          <AcquaintanceForm profiles={profiles} onSubmit={addAcquaintance} />
        </div>

        {/* List */}
        {acquaintances.length > 0 && (
          <div className="mt-6">
            <div className="mx-1 mb-2 text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]">
              All acquaintances
            </div>
            <div className="overflow-hidden rounded-[18px] border border-[#EBE6DC] bg-white">
              {acquaintances.map((a) => {
                const sub = [
                  a.descriptor,
                  a.inQueue ? `· every ${a.priorityRate} days` : '· not in queue',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <div key={a.id} className="flex items-center border-b border-[#F1ECE2] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => navigate('/acquaintance/' + a.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#EFEADF] font-['Newsreader'] text-[15px] text-[#6F6A60]">
                        {initialOf(a.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-['Newsreader'] text-[15px] text-[#26241F]">{a.name}</span>
                        <span className="block text-[12px] text-[#9A958A]">{sub}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing({ type: 'acquaintance', record: a })}
                      aria-label={`Edit ${a.name}`}
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

        {acquaintances.length === 0 && (
          <div className="mt-8 text-center font-['Newsreader'] text-[15px] italic text-[#B6B0A2]">
            No acquaintances yet — add your first one above.
          </div>
        )}

        <div className="h-6" />
      </main>

      {editing && (
        <EditCardModal
          type={editing.type}
          record={editing.record}
          profiles={profiles}
          onClose={() => setEditing(null)}
          onDeleted={() => setEditing(null)}
        />
      )}

      <BottomNav active="acquaintances" onNavigate={(key) => navigate(NAV_PATHS[key] || '/')} />
    </div>
  );
}
