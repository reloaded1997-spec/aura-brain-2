// =============================================================================
// pages/ProfilePage.jsx — Profile detail (Phase 4: live data)
// -----------------------------------------------------------------------------
// Resolves :id from the live profiles in useData(), and subscribes to the
// profile's requests + logs subcollections directly. Toggling/adding a request
// and the From-Journal log entries all flow through Firestore.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ProfileDetail from '../components/ProfileDetail';
import EditCardModal from '../components/EditCardModal';
import { BottomNav } from '../components/Navigation';
import { useData } from '../context/DataContext';
import { watchRequests, watchLogs, toggleRequest, addRequest, updateProfileNotes } from '../firebase/db';
import { decorateProfile, lastPrayedLabel } from '../utils/display';
import { getTodayLocal } from '../utils/queueMath';

// Firestore Timestamp -> "Jun 9". Falls back gracefully while serverTimestamp
// is still resolving (pending writes report null).
function formatLogDate(ts) {
  const d = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profiles, groups, loading } = useData();

  const [requests, setRequests] = useState([]);
  const [logs, setLogs] = useState([]);
  const [editing, setEditing] = useState(false);

  const notesTimerRef = useRef(null);
  const handleNotesChange = useCallback(
    (newNotes) => {
      clearTimeout(notesTimerRef.current);
      notesTimerRef.current = setTimeout(() => {
        updateProfileNotes(id, newNotes);
      }, 500);
    },
    [id]
  );

  const profile = useMemo(() => profiles.find((p) => p.id === id) || null, [profiles, id]);

  // Subscribe to subcollections for this profile.
  useEffect(() => {
    if (!id) return undefined;
    const unsubR = watchRequests(id, setRequests);
    const unsubL = watchLogs(id, setLogs);
    return () => {
      unsubR();
      unsubL();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F3] text-[#B6B0A2]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF8F3] px-6 text-center">
        <p className="font-['Newsreader'] text-[18px] text-[#6F6A60]">That profile isn’t here.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 text-[13px] text-[#A8845C] underline underline-offset-4"
        >
          Back to the Queue
        </button>
      </div>
    );
  }

  const decorated = decorateProfile(profile);
  const detailProfile = {
    ...decorated,
    role: decorated.sub,
    lastPrayedLabel: lastPrayedLabel(profile.lastClearedDate, getTodayLocal()),
  };

  const logView = logs.map((l) => ({
    id: l.id,
    date: formatLogDate(l.timestamp),
    text: l.text,
    fromJournal: !!l.fromJournal,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F3]">
      <div className="flex-1">
        <ProfileDetail
          profile={detailProfile}
          requests={requests}
          logs={logView}
          notes={profile.notes ?? ''}
          onBack={() => navigate(-1)}
          onEdit={() => setEditing(true)}
          onToggleRequest={(rid) => {
            const r = requests.find((x) => x.id === rid);
            if (r) toggleRequest(id, rid, !r.isCompleted);
          }}
          onAddRequest={(text) => addRequest(id, text)}
          onNotesChange={handleNotesChange}
        />
      </div>
      {editing && (
        <EditCardModal
          type="person"
          record={profile}
          groups={groups}
          onClose={() => setEditing(false)}
          onDeleted={() => navigate('/network')}
        />
      )}
      <BottomNav active="network" onNavigate={() => navigate('/')} />
    </div>
  );
}
