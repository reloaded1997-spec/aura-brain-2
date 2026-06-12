// =============================================================================
// pages/SearchPage.jsx — Search across the whole network (completes nav §5)
// -----------------------------------------------------------------------------
// Client-side search over the live useData() collections: people & standalone
// requests (name + descriptor), groups (name + descriptor), and habits (title).
// Everything is already in memory via onSnapshot, so results are instant as
// you type — no Firestore queries needed. Tapping a person opens their profile;
// the pencil edits any result in place (same EditCardModal as NetworkPage).
// =============================================================================

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Pencil, X } from 'lucide-react';
import { BottomNav, NAV_PATHS } from '../components/Navigation';
import EditCardModal from '../components/EditCardModal';
import { useData } from '../context/DataContext';
import { priorityLabelFromRate, initialOf } from '../utils/display';

// Case-insensitive substring match across a record's searchable fields.
function matches(q, ...fields) {
  return fields.some((f) => (f || '').toLowerCase().includes(q));
}

export default function SearchPage() {
  const navigate = useNavigate();
  const { profiles, groups, habits } = useData();
  const [query, setQuery] = useState('');
  // { type: 'person' | 'group' | 'habit', record } | null
  const [editing, setEditing] = useState(null);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return null;
    return {
      people: profiles.filter((p) => matches(q, p.name, p.descriptor)),
      groups: groups.filter((g) => matches(q, g.name, g.descriptor)),
      habits: habits.filter((h) => matches(q, h.title)),
    };
  }, [q, profiles, groups, habits]);

  const totalHits = results
    ? results.people.length + results.groups.length + results.habits.length
    : 0;

  function groupNameOf(p) {
    if (!p.groupId) return null;
    return groups.find((g) => g.id === p.groupId)?.name || null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F3] text-[#26241F]">
      {/* Header */}
      <div className="px-[22px] pt-14 pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[1.6px] text-[#9A958A]">
          Find anyone
        </div>
        <div className="mt-[3px] font-['Newsreader'] text-[32px] leading-[1.05] text-[#1F1D18]">
          Search
        </div>
      </div>

      <main className="flex-1 px-4">
        {/* Search field */}
        <div className="flex items-center gap-[10px] rounded-[15px] border border-[#EBE6DC] bg-white px-[14px] py-[11px] shadow-[0_1px_2px_rgba(40,36,31,0.03)] focus-within:border-[#D8B98E]">
          <SearchIcon className="h-[16px] w-[16px] flex-shrink-0 text-[#A39E92]" strokeWidth={1.8} />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="A name, a descriptor, a habit…"
            className="min-w-0 flex-1 bg-transparent font-['Newsreader'] text-[16px] text-[#26241F] placeholder:text-[#B0AB9E] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[#9A958A] hover:bg-[#F1ECE2]"
            >
              <X className="h-[14px] w-[14px]" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Idle / empty states */}
        {!results && (
          <div className="mt-10 text-center font-['Newsreader'] text-[15px] italic text-[#B6B0A2]">
            Everyone you carry is a few letters away.
          </div>
        )}
        {results && totalHits === 0 && (
          <div className="mt-10 text-center font-['Newsreader'] text-[15px] italic text-[#B6B0A2]">
            Nothing matches “{query.trim()}” yet.
          </div>
        )}

        {/* People & requests */}
        {results && results.people.length > 0 && (
          <Section title="People & requests">
            {results.people.map((p) => (
              <Row
                key={p.id}
                initial={initialOf(p.name)}
                square={p.kind === 'request'}
                name={p.name}
                sub={[
                  p.descriptor,
                  `${priorityLabelFromRate(p.priorityRate)} · every ${p.priorityRate} days`,
                  groupNameOf(p) && `in ${groupNameOf(p)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onClick={() => navigate(`/profile/${p.id}`)}
                onEdit={() => setEditing({ type: 'person', record: p })}
              />
            ))}
          </Section>
        )}

        {/* Groups */}
        {results && results.groups.length > 0 && (
          <Section title="Groups">
            {results.groups.map((g) => (
              <Row
                key={g.id}
                initial={initialOf(g.name)}
                square
                name={g.name}
                sub={`every ${g.priorityRate} days · ${
                  profiles.filter((p) => p.groupId === g.id).length
                } members`}
                onEdit={() => setEditing({ type: 'group', record: g })}
              />
            ))}
          </Section>
        )}

        {/* Habits */}
        {results && results.habits.length > 0 && (
          <Section title="Daily rhythm">
            {results.habits.map((h) => (
              <Row
                key={h.id}
                initial={initialOf(h.title)}
                square
                name={h.title}
                sub={
                  h.type === 'temporary'
                    ? `challenge · ${h.currentStreak || 0}/${h.targetCount || '?'} days`
                    : `permanent · ${h.currentStreak || 0}d streak`
                }
                onEdit={() => setEditing({ type: 'habit', record: h })}
              />
            ))}
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

      <BottomNav active="search" onNavigate={(key) => navigate(NAV_PATHS[key] || '/')} />
    </div>
  );
}

// ---- Reusable bits (mirrors NetworkPage's list styling) ----------------------
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
          <span className="block truncate font-['Newsreader'] text-[15px] text-[#26241F]">
            {name}
          </span>
          <span className="block truncate text-[12px] text-[#9A958A]">{sub}</span>
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
