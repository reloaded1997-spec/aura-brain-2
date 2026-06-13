// =============================================================================
// pages/JournalPage.jsx — Journal capture (Phase 4: live writes)
// -----------------------------------------------------------------------------
// Saving writes a journals doc to Firestore, which fires the routeJournalEntry
// Cloud Function — it recognizes named people/groups and appends "From Journal"
// entries to their relational logs (§6). The on-screen detection panel is still
// an illustrative preview; the real routing happens server-side, moments later.
// =============================================================================

import { useNavigate } from 'react-router-dom';
import JournalCapture from '../components/JournalCapture';
import JournalHistory from '../components/JournalHistory';
import { BottomNav, NAV_PATHS } from '../components/Navigation';
import { useData } from '../context/DataContext';

export default function JournalPage() {
  const navigate = useNavigate();
  const { addJournalEntry, journals, profiles } = useData();

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F3]">
      <div className="flex-1 overflow-y-auto">
        <JournalCapture
          onCancel={() => navigate('/')}
          onSave={({ text }) => {
            const body = (text || '').trim();
            if (body) addJournalEntry(body); // triggers routeJournalEntry function
          }}
        />

        {/* History */}
        <div className="px-4 pb-6 pt-2">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]">
            Past entries
          </div>
          <JournalHistory entries={journals} profiles={profiles} />
        </div>
      </div>
      <BottomNav active="journal" onNavigate={(key) => navigate(NAV_PATHS[key] || '/')} />
    </div>
  );
}
