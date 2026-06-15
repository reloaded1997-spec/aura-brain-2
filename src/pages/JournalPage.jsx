// =============================================================================
// pages/JournalPage.jsx — Journal tab (Phase 5: confirm-before-route)
// -----------------------------------------------------------------------------
// Saving a journal entry now emits the full confirmed payload (which people,
// which habits, which AI-suggested requests the user checked). The
// routeJournalEntry Cloud Function honors those selections — nothing routes
// automatically any more for gated entries.
// =============================================================================

import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import JournalCapture from '../components/JournalCapture';
import JournalHistory from '../components/JournalHistory';
import { BottomNav, NAV_PATHS } from '../components/Navigation';
import { useData } from '../context/DataContext';
import { functions } from '../firebase/config';

// Wraps the suggestJournalEntities callable — called only when the user taps
// "Suggest with AI". Returns { suggestions, habitSuggestions }.
async function analyzeDraft(text) {
  const fn = httpsCallable(functions, 'suggestJournalEntities');
  const result = await fn({ text });
  return result.data;
}

export default function JournalPage() {
  const navigate = useNavigate();
  const { addJournalEntry, deleteJournalEntry, journals, profiles, groups, habits } = useData();

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F3] dark:bg-[#171511]">
      <div className="flex-1 overflow-y-auto">
        <JournalCapture
          profiles={profiles}
          groups={groups}
          habits={habits}
          analyzeDraft={analyzeDraft}
          onCancel={() => navigate('/')}
          onSave={(payload) => {
            const body = (payload.text || '').trim();
            if (body) addJournalEntry({ ...payload, text: body });
          }}
        />

        {/* History */}
        <div className="px-4 pb-6 pt-2">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A] dark:text-[#827C70]">
            Past entries
          </div>
          <JournalHistory
            entries={journals}
            profiles={profiles}
            habits={habits}
            deleteJournalEntry={deleteJournalEntry}
          />
        </div>
      </div>
      <BottomNav active="journal" onNavigate={(key) => navigate(NAV_PATHS[key] || '/')} />
    </div>
  );
}
