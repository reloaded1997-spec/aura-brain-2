// =============================================================================
// pages/NetworkPage.jsx — Network & create forms (Phase 4)
// -----------------------------------------------------------------------------
// The directory + the way real content gets into Firestore: add people,
// standalone requests, groups, and habits. Every submit writes through useData()
// and the live listeners refresh the lists. Tap a person to open their profile.
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Sparkles, Plus } from 'lucide-react';
import { BottomNav } from '../components/Navigation';
import { useData } from '../context/DataContext';
import { PRIORITY_RATES, priorityLabelFromRate, initialOf } from '../utils/display';

const TABS = [
  { key: 'person', label: 'Person', Icon: UserPlus },
  { key: 'group', label: 'Group', Icon: Users },
  { key: 'habit', label: 'Habit', Icon: Sparkles },
];

const fieldCls =
  'w-full rounded-lg border border-[#E2DCD0] bg-white px-3 py-2 text-[14px] text-[#26241F] placeholder:text-[#B0AB9E] focus:border-[#A8845C] focus:outline-none focus:ring-1 focus:ring-[#D8B98E]';
const labelCls = 'mb-1 block text-[11px] font-semibold uppercase tracking-[1px] text-[#9A958A]';

export default function NetworkPage() {
  const navigate = useNavigate();
  const { profiles, groups, addProfile, addGroup, addHabit } = useData();
  const [tab, setTab] = useState('person');

  const standalone = profiles.filter((p) => !p.groupId);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F3] text-[#26241F]">
      {/* Header */}
      <div className="px-[22px] pt-14 pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[1.6px] text-[#9A958A]">
          Your network
        </div>
        <div className="mt-[3px] font-['Newsreader'] text-[32px] leading-[1.05] text-[#1F1D18]">
          People &amp; rhythms
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
          {tab === 'person' && <PersonForm groups={groups} onAdd={addProfile} />}
          {tab === 'group' && <GroupForm onAdd={addGroup} />}
          {tab === 'habit' && <HabitForm onAdd={addHabit} />}
        </div>

        {/* Existing groups */}
        {groups.length > 0 && (
          <Section title="Groups">
            {groups.map((g) => (
              <Row key={g.id} initial={initialOf(g.name)} square name={g.name}
                   sub={`every ${g.priorityRate} days · ${profiles.filter((p) => p.groupId === g.id).length} members`} />
            ))}
          </Section>
        )}

        {/* Standalone people & requests */}
        <Section title="People & requests">
          {standalone.length === 0 && (
            <div className="px-1 py-3 font-['Newsreader'] text-[14px] italic text-[#B6B0A2]">
              No one yet — add your first person above.
            </div>
          )}
          {standalone.map((p) => (
            <Row
              key={p.id}
              initial={initialOf(p.name)}
              square={p.kind === 'request'}
              name={p.name}
              sub={`${priorityLabelFromRate(p.priorityRate)} · every ${p.priorityRate} days`}
              onClick={() => navigate(`/profile/${p.id}`)}
            />
          ))}
        </Section>

        <div className="h-6" />
      </main>

      <BottomNav active="network" onNavigate={(key) => navigate(key === 'network' ? '/network' : key === 'journal' ? '/journal' : '/')} />
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

function Row({ initial, name, sub, square, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center gap-3 border-b border-[#F1ECE2] px-4 py-3 text-left last:border-b-0 disabled:cursor-default"
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
  );
}

function SubmitButton({ children }) {
  return (
    <button
      type="submit"
      className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#A8845C] py-2.5 font-['Newsreader'] text-[15px] text-white transition-colors hover:bg-[#9a774f]"
    >
      <Plus className="h-4 w-4" strokeWidth={2} />
      {children}
    </button>
  );
}

function RateSelect({ value, onChange }) {
  return (
    <select className={fieldCls} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {PRIORITY_RATES.map((r) => (
        <option key={r} value={r}>
          every {r} days · {priorityLabelFromRate(r)}
        </option>
      ))}
    </select>
  );
}

// ---- Forms ------------------------------------------------------------------
function PersonForm({ groups, onAdd }) {
  const [name, setName] = useState('');
  const [descriptor, setDescriptor] = useState('');
  const [kind, setKind] = useState('person');
  const [priorityRate, setPriorityRate] = useState(7);
  const [groupId, setGroupId] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), descriptor: descriptor.trim(), kind, priorityRate, groupId: groupId || null });
    setName('');
    setDescriptor('');
    setGroupId('');
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className={labelCls}>Name</label>
        <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Marcus Bell" />
      </div>
      <div>
        <label className={labelCls}>Descriptor</label>
        <input className={fieldCls} value={descriptor} onChange={(e) => setDescriptor(e.target.value)} placeholder="Brother in Christ · job search" />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelCls}>Type</label>
          <select className={fieldCls} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="person">Person</option>
            <option value="request">Standalone request</option>
          </select>
        </div>
        <div className="flex-1">
          <label className={labelCls}>Cycle</label>
          <RateSelect value={priorityRate} onChange={setPriorityRate} />
        </div>
      </div>
      {groups.length > 0 && (
        <div>
          <label className={labelCls}>Group (optional)</label>
          <select className={fieldCls} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">— none (standalone) —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <SubmitButton>Add to network</SubmitButton>
    </form>
  );
}

function GroupForm({ onAdd }) {
  const [name, setName] = useState('');
  const [descriptor, setDescriptor] = useState('');
  const [priorityRate, setPriorityRate] = useState(7);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), descriptor: descriptor.trim(), priorityRate });
    setName('');
    setDescriptor('');
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className={labelCls}>Group name</label>
        <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Fresno Home Church" />
      </div>
      <div>
        <label className={labelCls}>Descriptor</label>
        <input className={fieldCls} value={descriptor} onChange={(e) => setDescriptor(e.target.value)} placeholder="pray as one body" />
      </div>
      <div>
        <label className={labelCls}>Cycle</label>
        <RateSelect value={priorityRate} onChange={setPriorityRate} />
      </div>
      <SubmitButton>Create group</SubmitButton>
    </form>
  );
}

function HabitForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('permanent');
  const [targetCount, setTargetCount] = useState(28);

  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      type,
      targetCount: type === 'temporary' ? targetCount : null,
    });
    setTitle('');
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className={labelCls}>Habit</label>
        <input className={fieldCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Read the Bible" />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelCls}>Kind</label>
          <select className={fieldCls} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="permanent">Permanent</option>
            <option value="temporary">Time-boxed challenge</option>
          </select>
        </div>
        {type === 'temporary' && (
          <div className="w-28">
            <label className={labelCls}>Target days</label>
            <input
              type="number"
              min={1}
              className={fieldCls}
              value={targetCount}
              onChange={(e) => setTargetCount(Number(e.target.value))}
            />
          </div>
        )}
      </div>
      <SubmitButton>Add habit</SubmitButton>
    </form>
  );
}
