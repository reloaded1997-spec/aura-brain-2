// =============================================================================
// components/EditCardModal.jsx — Edit or delete a person / group / habit card
// -----------------------------------------------------------------------------
// A centered overlay sheet hosting the same form used to create the card (from
// CardForms), pre-filled with the record's current values. Saving writes the
// patch through useData() and closes; the live onSnapshot listeners refresh the
// lists everywhere. Reused by NetworkPage and ProfilePage.
//
// Deletion is guarded: tapping "Delete" swaps the form for a confirmation step
// that spells out the consequence for that card kind (people lose their requests
// + logs; a group's members are detached, not deleted; a habit loses its streak).
//
// Props:
//   type      : 'person' | 'group' | 'habit'
//   record    : the Firestore doc being edited ({ id, ... })
//   groups    : groups list (for the person form's group picker)
//   profiles  : profiles list (to find a group's members for detach-on-delete)
//   onClose   : () => void
//   onDeleted : () => void  — optional; fires after a successful delete (e.g. so
//               ProfilePage can navigate away from the now-gone profile)
// =============================================================================

import { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { PersonForm, GroupForm, HabitForm, AcquaintanceForm } from './CardForms';

const TITLES = { person: 'Edit person', group: 'Edit group', habit: 'Edit habit', acquaintance: 'Edit acquaintance' };

export default function EditCardModal({
  type,
  record,
  groups = [],
  profiles = [],
  onClose = () => {},
  onDeleted = () => {},
}) {
  const { updateProfile, updateGroup, updateHabit, deleteProfile, deleteGroup, deleteHabit, updateAcquaintance, deleteAcquaintance, goals } = useData();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!type || !record) return null;

  const members = type === 'group' ? profiles.filter((p) => p.groupId === record.id) : [];
  const label = record.name || record.title || 'this card';

  function deleteWarning() {
    if (type === 'person') {
      return `”${label}” and all of their active requests and relational log history will be permanently removed. This can't be undone.`;
    }
    if (type === 'group') {
      if (members.length === 0) return `The group “${label}” will be permanently removed. This can't be undone.`;
      const noun = members.length === 1 ? 'person' : 'people';
      return `The group “${label}” will be removed. Its ${members.length} ${noun} will be kept as standalone profiles — they won't be deleted. This can't be undone.`;
    }
    if (type === 'acquaintance') {
      return `”${label}” and all of its updates will be permanently removed. This can't be undone.`;
    }
    return `The habit “${label}” and its streak history will be permanently removed. This can't be undone.`;
  }

  function handleSubmit(payload) {
    if (type === 'person') updateProfile(record.id, payload);
    else if (type === 'group') updateGroup(record.id, payload);
    else if (type === 'habit') updateHabit(record.id, payload);
    else if (type === 'acquaintance') updateAcquaintance(record.id, payload);
    onClose();
  }

  async function handleDelete() {
    setBusy(true);
    try {
      if (type === 'person') await deleteProfile(record.id);
      else if (type === 'group') await deleteGroup(record.id, members.map((m) => m.id));
      else if (type === 'habit') await deleteHabit(record.id);
      else if (type === 'acquaintance') await deleteAcquaintance(record.id);
      onDeleted();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-4 pt-20 sm:items-center sm:pb-0"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-[20px] border border-[#EBE6DC] bg-white p-4 shadow-[0_8px_30px_rgba(40,36,31,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        {confirming ? (
          // ---- Delete confirmation ---------------------------------------
          <div>
            <div className="mb-3 flex items-start gap-3">
              <span className="mt-[2px] flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#FBEDEA] text-[#B4502F]">
                <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </span>
              <div>
                <div className="font-['Newsreader'] text-[20px] leading-tight text-[#1F1D18]">
                  Delete {type}?
                </div>
                <p className="mt-[6px] text-[13.5px] leading-[1.45] text-[#6F6A60]">{deleteWarning()}</p>
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
          // ---- Edit form -------------------------------------------------
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="font-['Newsreader'] text-[20px] text-[#1F1D18]">{TITLES[type]}</div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#9A958A] hover:bg-[#F1ECE2]"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={2} />
              </button>
            </div>

            {type === 'person' && (
              <PersonForm mode="edit" initial={record} groups={groups} onSubmit={handleSubmit} />
            )}
            {type === 'group' && <GroupForm mode="edit" initial={record} onSubmit={handleSubmit} />}
            {type === 'habit' && <HabitForm mode="edit" initial={record} goals={goals} onSubmit={handleSubmit} />}
            {type === 'acquaintance' && (
              <AcquaintanceForm mode="edit" initial={record} profiles={profiles} onSubmit={handleSubmit} />
            )}

            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#EBD9D2] bg-white py-2 text-[13px] font-semibold text-[#B4502F] transition-colors hover:bg-[#FBEDEA]"
            >
              <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.9} />
              Delete {type}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
