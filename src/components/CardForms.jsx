// =============================================================================
// components/CardForms.jsx — Shared create/edit forms for the three card kinds
// -----------------------------------------------------------------------------
// One source of truth for the Person, Group, and Habit field sets so the create
// flow (NetworkPage) and the edit flow (EditCardModal) can never drift apart.
//
// Each form takes:
//   mode        : 'create' | 'edit'   — drives the submit label + post-submit reset
//   initial     : the record being edited (ignored in create mode)
//   onSubmit    : (payload) => void    — add* action (create) or update (edit)
//   submitLabel : optional override for the button text
//
// In create mode the form clears itself after a successful submit; in edit mode
// the hosting modal closes, so no reset is needed.
// =============================================================================

import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { PRIORITY_RATES, priorityLabelFromRate, initialOf } from '../utils/display';

export const fieldCls =
  'w-full rounded-lg border border-[#E2DCD0] dark:border-[#302C25] bg-white dark:bg-[#171511] px-3 py-2 text-[14px] text-[#26241F] dark:text-[#ECE7DD] placeholder:text-[#B0AB9E] dark:placeholder:text-[#6E685D] focus:border-[#A8845C] focus:outline-none focus:ring-1 focus:ring-[#D8B98E]';
export const labelCls =
  'mb-1 block text-[11px] font-semibold uppercase tracking-[1px] text-[#9A958A] dark:text-[#827C70]';

function SubmitButton({ mode, children }) {
  return (
    <button
      type="submit"
      className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#A8845C] dark:bg-[#C49A6C] py-2.5 font-['Newsreader'] text-[15px] text-white transition-colors hover:bg-[#9a774f] dark:hover:bg-[#b38a5e]"
    >
      {mode === 'create' ? <Plus className="h-4 w-4" strokeWidth={2} /> : <Check className="h-4 w-4" strokeWidth={2} />}
      {children}
    </button>
  );
}

export function RateSelect({ value, onChange }) {
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

// ---- Person -----------------------------------------------------------------
export function PersonForm({ groups = [], mode = 'create', initial = null, defaultPriorityRate = 7, onSubmit, submitLabel }) {
  const [name, setName] = useState(initial?.name || '');
  const [descriptor, setDescriptor] = useState(initial?.descriptor || '');
  const [kind, setKind] = useState(initial?.kind || 'person');
  const [priorityRate, setPriorityRate] = useState(initial?.priorityRate || defaultPriorityRate);
  const [groupId, setGroupId] = useState(initial?.groupId || '');
  const [submitError, setSubmitError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitError(null);
    try {
      await onSubmit({ name: name.trim(), descriptor: descriptor.trim(), kind, priorityRate, groupId: groupId || null });
      if (mode === 'create') {
        setName('');
        setDescriptor('');
        setGroupId('');
      }
    } catch (err) {
      console.error('[PersonForm] submit failed:', err.code, err.message);
      setSubmitError(err.message || 'Failed to save. Please try again.');
    }
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
      {submitError && (
        <p className="text-[13px]" style={{ color: '#B4502F' }}>{submitError}</p>
      )}
      <SubmitButton mode={mode}>{submitLabel || (mode === 'create' ? 'Add to network' : 'Save changes')}</SubmitButton>
    </form>
  );
}

// ---- Group ------------------------------------------------------------------
export function GroupForm({ mode = 'create', initial = null, defaultPriorityRate = 7, onSubmit, submitLabel }) {
  const [name, setName] = useState(initial?.name || '');
  const [descriptor, setDescriptor] = useState(initial?.descriptor || '');
  const [priorityRate, setPriorityRate] = useState(initial?.priorityRate || defaultPriorityRate);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), descriptor: descriptor.trim(), priorityRate });
    if (mode === 'create') {
      setName('');
      setDescriptor('');
    }
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
      <SubmitButton mode={mode}>{submitLabel || (mode === 'create' ? 'Create group' : 'Save changes')}</SubmitButton>
    </form>
  );
}

// ---- Acquaintance -----------------------------------------------------------
export function AcquaintanceForm({ profiles = [], mode = 'create', initial = null, onSubmit, submitLabel }) {
  const [name, setName] = useState(initial?.name || '');
  const [descriptor, setDescriptor] = useState(initial?.descriptor || '');
  const [inQueue, setInQueue] = useState(initial?.inQueue ?? false);
  const [priorityRate, setPriorityRate] = useState(initial?.priorityRate || 7);
  const [linkedProfileIds, setLinkedProfileIds] = useState(initial?.linkedProfileIds || []);
  const [submitError, setSubmitError] = useState(null);

  const people = profiles.filter((p) => !p.kind || p.kind === 'person');

  function toggleLink(id) {
    setLinkedProfileIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitError(null);
    try {
      await onSubmit({ name: name.trim(), descriptor: descriptor.trim(), inQueue, priorityRate, linkedProfileIds });
      if (mode === 'create') {
        setName('');
        setDescriptor('');
        setInQueue(false);
        setPriorityRate(7);
        setLinkedProfileIds([]);
      }
    } catch (err) {
      console.error('[AcquaintanceForm] submit failed:', err.code, err.message);
      setSubmitError(err.message || 'Failed to save. Please try again.');
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className={labelCls}>Name</label>
        <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah's brother Mike" />
      </div>
      <div>
        <label className={labelCls}>Descriptor</label>
        <input className={fieldCls} value={descriptor} onChange={(e) => setDescriptor(e.target.value)} placeholder="met at the men's retreat" />
      </div>
      <div className="flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={inQueue}
            onChange={(e) => setInQueue(e.target.checked)}
            className="h-4 w-4 accent-[#A8845C]"
          />
          <span className="text-[13px] text-[#6F6A60] dark:text-[#A39C8E]">Surface in Daily Queue</span>
        </label>
      </div>
      {inQueue && (
        <div>
          <label className={labelCls}>Cycle</label>
          <RateSelect value={priorityRate} onChange={setPriorityRate} />
        </div>
      )}
      {people.length > 0 && (
        <div>
          <label className={labelCls}>Connections (People)</label>
          <div className="rounded-lg border border-[#E2DCD0] dark:border-[#302C25] bg-white dark:bg-[#171511] px-3 py-2 flex flex-col gap-1 max-h-40 overflow-y-auto">
            {people.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 py-[3px]">
                <input
                  type="checkbox"
                  checked={linkedProfileIds.includes(p.id)}
                  onChange={() => toggleLink(p.id)}
                  className="h-4 w-4 accent-[#A8845C]"
                />
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#EFEADF] dark:bg-[#2A2620] font-['Newsreader'] text-[11px] text-[#6F6A60] dark:text-[#A39C8E]">
                  {initialOf(p.name)}
                </span>
                <span className="text-[13px] text-[#26241F] dark:text-[#ECE7DD]">{p.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {submitError && (
        <p className="text-[13px]" style={{ color: '#B4502F' }}>{submitError}</p>
      )}
      <SubmitButton mode={mode}>{submitLabel || (mode === 'create' ? 'Add acquaintance' : 'Save changes')}</SubmitButton>
    </form>
  );
}

// ---- Habit ------------------------------------------------------------------
// goals: optional array of goal docs. When non-empty, a goal selector is shown
// so the habit can be linked to a parent goal from either create or edit mode.
export function HabitForm({ mode = 'create', initial = null, goals = [], onSubmit, submitLabel }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [type, setType] = useState(initial?.type || 'permanent');
  const [targetCount, setTargetCount] = useState(initial?.targetCount || 28);
  const [goalId, setGoalId] = useState(initial?.goalId || '');

  const activeGoals = goals.filter((g) => g.status === 'active');

  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      type,
      targetCount: type === 'temporary' ? targetCount : null,
    };
    if (goals.length > 0) payload.goalId = goalId || null;
    onSubmit(payload);
    if (mode === 'create') {
      setTitle('');
      setGoalId('');
    }
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
      {activeGoals.length > 0 && (
        <div>
          <label className={labelCls}>Goal (optional)</label>
          <select className={fieldCls} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">— no goal —</option>
            {activeGoals.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      )}
      <SubmitButton mode={mode}>{submitLabel || (mode === 'create' ? 'Add habit' : 'Save changes')}</SubmitButton>
    </form>
  );
}
