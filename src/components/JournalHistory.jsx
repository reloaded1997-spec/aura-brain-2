// components/JournalHistory.jsx — Journal entry log with cascade delete
import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';

function formatEntryDate(timestamp) {
  if (!timestamp) return 'Just now';
  const d = timestamp.toDate();
  const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

function EntryCard({ entry, profiles, habits, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const preview = entry.text.length > 120 ? entry.text.slice(0, 120) + '…' : entry.text;

  const linkedNames = useMemo(() => {
    if (!entry.linkedProfileIds?.length) return [];
    return entry.linkedProfileIds
      .map((pid) => profiles.find((p) => p.id === pid)?.name)
      .filter(Boolean);
  }, [entry.linkedProfileIds, profiles]);

  const linkedHabitNames = useMemo(() => {
    if (!entry.linkedHabitIds?.length) return [];
    return entry.linkedHabitIds
      .map((hid) => habits.find((h) => h.id === hid)?.title)
      .filter(Boolean);
  }, [entry.linkedHabitIds, habits]);

  const linkedCount =
    (entry.linkedProfileIds?.length || 0) + (entry.linkedHabitIds?.length || 0);

  async function handleDeleteConfirm() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(entry);
      // onSnapshot removes the card when the journal doc is deleted; nothing
      // else needed here unless the delete succeeded but the listener is slow.
    } catch (err) {
      console.error('[JournalHistory] delete failed:', err);
      setDeleteError('Delete failed — try again.');
      setDeleting(false);
    }
  }

  function handleCancel() {
    setConfirming(false);
    setDeleteError(null);
  }

  return (
    <div className="rounded-[18px] border border-[#EBE6DC] dark:border-[#322E27] bg-white dark:bg-[#221F1B] px-[15px] py-[13px] shadow-[0_1px_2px_rgba(40,36,31,0.03)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.32)]">
      {/* Top row: timestamp + trash icon */}
      <div className="flex items-start justify-between mb-[6px]">
        <div className="text-[11px] text-[#9A958A] dark:text-[#827C70]">{formatEntryDate(entry.timestamp)}</div>
        {!confirming && !deleting && (
          <button
            type="button"
            aria-label="Delete entry"
            onClick={() => setConfirming(true)}
            className="ml-2 flex-shrink-0 text-[#C3BCAD] dark:text-[#544E45] hover:text-[#C47A6A] dark:hover:text-[#D48878] transition-colors"
          >
            <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.6} />
          </button>
        )}
      </div>

      <p className="font-['Newsreader'] text-[15px] leading-[1.55] text-[#3A372F] dark:text-[#D6D1C6]">{preview}</p>

      {/* Linked chips */}
      {(linkedNames.length > 0 || linkedHabitNames.length > 0) && (
        <div className="mt-[9px] flex flex-wrap gap-[6px]">
          {linkedNames.map((name) => (
            <span
              key={name}
              className="rounded-full bg-[#F1ECE2] dark:bg-[#272320] px-[9px] py-[3px] text-[11px] text-[#6F6A60] dark:text-[#A39C8E]"
            >
              {name}
            </span>
          ))}
          {linkedHabitNames.map((name) => (
            <span
              key={name}
              className="rounded-full bg-[#F1ECE2] dark:bg-[#272320] px-[9px] py-[3px] text-[11px] text-[#A8845C] dark:text-[#C49A6C]"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {/* Inline delete confirmation */}
      {confirming && (
        <div className="mt-[12px] rounded-[12px] border border-[#EDE8DE] dark:border-[#2A2620] bg-[#FAF8F3] dark:bg-[#1D1A16] px-[12px] py-[11px]">
          <p className="font-['Newsreader'] text-[14px] leading-[1.4] text-[#3A372F] dark:text-[#D6D1C6] mb-[10px]">
            Delete this entry
            {linkedCount > 0
              ? ` and ${linkedCount} linked ${linkedCount === 1 ? 'note' : 'notes'}?`
              : '?'}
          </p>
          {deleteError && (
            <p className="mb-[8px] text-[12px] text-[#C47A6A] dark:text-[#D48878]">{deleteError}</p>
          )}
          <div className="flex gap-[8px]">
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteConfirm}
              className="flex-1 rounded-[10px] bg-[#C47A6A] dark:bg-[#B86A5A] py-[8px] font-['Newsreader'] text-[14px] text-white transition-colors hover:bg-[#b86a5a] disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleCancel}
              className="flex-1 rounded-[10px] border border-[#E6E0D5] dark:border-[#302C25] py-[8px] font-['Newsreader'] text-[14px] text-[#6F6A60] dark:text-[#A39C8E] disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JournalHistory({ entries = [], profiles = [], habits = [], deleteJournalEntry }) {
  if (entries.length === 0) {
    return (
      <p className="text-center font-['Newsreader'] text-[15px] italic text-[#B6B0A2] dark:text-[#6A645A]">
        Your journal is empty. Start writing.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          profiles={profiles}
          habits={habits}
          onDelete={deleteJournalEntry}
        />
      ))}
    </div>
  );
}
