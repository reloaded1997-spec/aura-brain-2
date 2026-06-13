// =============================================================================
// pages/NetworkPage.jsx — Circle tab: relationship directory + create forms
// -----------------------------------------------------------------------------
// The relationships hub. Add people, requests, groups, and acquaintances; view
// and edit existing ones. Every submit writes through useData() and the live
// listeners refresh the lists. Tap a person to open their profile, or tap the
// pencil on any row to edit that card in place (EditCardModal).
//
// Habits have moved to the Rhythms & Tasks tab (/rhythms).
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Pencil, Contact } from 'lucide-react';
import { BottomNav, NAV_PATHS } from '../components/Navigation';
import { PersonForm, GroupForm, AcquaintanceForm } from '../components/CardForms';
import EditCardModal from '../components/EditCardModal';
import { useData } from '../context/DataContext';
import { priorityLabelFromRate, initialOf } from '../utils/display';

const TABS = [
  { key: 'person',      label: 'Person',      Icon: UserPlus },
  { key: 'group',       label: 'Group',        Icon: Users },
  { key: 'acquaintance', label: 'Acq.',        Icon: Contact },
];

export default function NetworkPage() {
  const navigate = useNavigate();
  const { profiles, groups, acquaintances, addProfile, addGroup, addAcquaintance } = useData();
  const [tab, setTab] = useState('person');
  const [editing, setEditing] = useState(null);

  const people = profiles;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F3] text-[#26241F]">
      {/* Header */}
      <div className="px-[22px] pt-14 pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[1.6px] text-[#9A958A]">
          Your circle
        </div>
        <div className="mt-[3px] font-['Newsreader'] text-[32px] leading-[1.05] text-[#1F1D18]">
          People &amp; groups
        </div>
      </div>

      <main className="flex-1 px-4">
        {/* Add — segmented control */}
        <div className="mb-3 flex gap-1 rounded-xl bg-[#EFEAE0] p-1">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-[6px] rounded-lg py-2 font-['Newsreader'] text-[14px] transition-all ${
                tab === key
                  ? 'border border-[#E6DFD2] bg-white text-[#26241F] shadow-[0_1px_2px_rgba(40,36,31,0.08)]'
                  : 'border border-transparent text-[#9A958A]'
              }`}
            >
              <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-[18px] border border-[#EBE6DC] bg-white p-4 shadow-[0_1px_2px_rgba(40,36,31,0.03)]">
          {tab === 'person'      && <PersonForm groups={groups} onSubmit={addProfile} />}
          {tab === 'group'       && <GroupForm onSubmit={addGroup} />}
          {tab === 'acquaintance' && <AcquaintanceForm profiles={profiles} onSubmit={addAcquaintance} />}
        </div>

        {/* Existing groups */}
        {groups.length > 0 && (
          <Section title="Groups">
            {groups.map((g) => (
              <Row
                key={g.id}
                initial={initialOf(g.name)}
                square
                name={g.name}
                sub={`every ${g.priorityRate} days · ${profiles.filter((p) => p.groupId === g.id).length} members`}
                onEdit={() => setEditing({ type: 'group', record: g })}
              />
            ))}
          </Section>
        )}

        {/* Standalone people & requests */}
        <Section title="People & requests">
          {people.length === 0 && (
            <div className="px-1 py-3 font-['Newsreader'] text-[14px] italic text-[#B6B0A2]">
              No one yet — add your first person above.
            </div>
          )}
          {people.map((p) => (
            <Row
              key={p.id}
              initial={initialOf(p.name)}
              square={p.kind === 'request'}
              name={p.name}
              sub={`${priorityLabelFromRate(p.priorityRate)} · every ${p.priorityRate} days`}
              onClick={() => navigate(`/profile/${p.id}`)}
              onEdit={() => setEditing({ type: 'person', record: p })}
            />
          ))}
        </Section>

        {/* Acquaintances */}
        {acquaintances.length > 0 && (
          <Section title="Acquaintances">
            {acquaintances.map((a) => {
              const sub = [
                a.descriptor,
                a.inQueue ? `· every ${a.priorityRate} days` : '· not in queue',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <Row
                  key={a.id}
                  initial={initialOf(a.name)}
                  name={a.name}
                  sub={sub}
                  onClick={() => navigate('/acquaintance/' + a.id)}
                  onEdit={() => setEditing({ type: 'acquaintance', record: a })}
                />
              );
            })}
          </Section>
        )}

        <div className="h-6" />
      </main>

      {editing && (
        <EditCardModal
          type={editing.type}
          record={editing.record}
          groups={groups}
          profiles={profiles}
          onClose={() => setEditing(null)}
        />
      )}

      <BottomNav active="circle" onNavigate={(key) => navigate(NAV_PATHS[key] || '/')} />
    </div>
  );
}

// ---- Reusable bits ----------------------------------------------------------
function Section({ title, children }) {
  return (
    <div className="mt-6">
      <div className="mx-1 mb-2 text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]">
        {title}
      </div>
      <div className="overflow-hidden rounded-[18px] border border-[#EBE6DC] bg-white">{children}</div>
    </div>
  );
}

function Row({ initial, name, sub, square, onClick, onEdit }) {
  return (
    <div className="flex items-center border-b border-[#F1ECE2] last:border-b-0">
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left disabled:cursor-default"
      >
        <span
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center bg-[#EFEADF] font-['Newsreader'] text-[15px] text-[#6F6A60] ${
            square ? 'rounded-[10px]' : 'rounded-full'
          }`}
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-['Newsreader'] text-[15px] text-[#26241F]">{name}</span>
          <span className="block text-[12px] text-[#9A958A]">{sub}</span>
        </span>
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${name}`}
          className="mr-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#9A958A] transition-colors hover:bg-[#F1ECE2] hover:text-[#6F6A60]"
        >
          <Pencil className="h-[15px] w-[15px]" strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}
