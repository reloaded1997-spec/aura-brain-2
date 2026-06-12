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
import { BottomNav } from '../components/Navigation';
import { useData } from '../context/DataContext';
export default function JournalPage() {
  const navigate = useNavigate();
  const { addJournalEntry } = useData();

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F3]">
      <div className="flex-1">
        <JournalCapture
          onCancel={() => navigate('/')}
          onSave={({ text }) => {
            const body = (text || '').trim();
            if (body) addJournalEntry(body); // triggers routeJournalEntry function
          }}
        />
      </div>
      <BottomNav
        active="journal"
        onNavigate={(key) =>
          navigate(key === 'journal' ? '/journal' : key === 'network' ? '/network' : '/')
        }
      />
    </div>
  );
}
