// =============================================================================
// pages/AcquaintanceDetailPage.jsx — Live wrapper for AcquaintanceDetail
// =============================================================================

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AcquaintanceDetail from '../components/AcquaintanceDetail';
import EditCardModal from '../components/EditCardModal';
import { BottomNav, NAV_PATHS } from '../components/Navigation';
import { useData } from '../context/DataContext';
import { watchUpdates, addUpdate } from '../firebase/db';
import { decorateAcquaintance, initialOf } from '../utils/display';

export default function AcquaintanceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { acquaintances, profiles, loading } = useData();

  const [updates, setUpdates] = useState([]);
  const [editing, setEditing] = useState(false);

  const acq = acquaintances.find((a) => a.id === id) || null;

  useEffect(() => {
    if (!id) return undefined;
    const unsub = watchUpdates(id, setUpdates);
    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F3] text-[#B6B0A2]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!acq) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF8F3] px-6 text-center">
        <p className="font-['Newsreader'] text-[18px] text-[#6F6A60]">That acquaintance isn't here.</p>
        <button
          type="button"
          onClick={() => navigate('/acquaintances')}
          className="mt-4 text-[13px] text-[#A8845C] underline underline-offset-4"
        >
          Back to Acquaintances
        </button>
      </div>
    );
  }

  const decorated = decorateAcquaintance(acq);

  const connections = profiles
    .filter((p) => acq.linkedProfileIds?.includes(p.id))
    .map((p) => ({ id: p.id, name: p.name, initial: initialOf(p.name) }));

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F3]">
      <div className="flex-1">
        <AcquaintanceDetail
          acquaintance={decorated}
          updates={updates}
          connections={connections}
          onBack={() => navigate(-1)}
          onEdit={() => setEditing(true)}
          onAddUpdate={(text) => addUpdate(id, text)}
          onOpenConnection={(pid) => navigate('/profile/' + pid)}
        />
      </div>

      {editing && (
        <EditCardModal
          type="acquaintance"
          record={acq}
          profiles={profiles}
          onClose={() => setEditing(false)}
          onDeleted={() => navigate('/acquaintances')}
        />
      )}

      <BottomNav active="acquaintances" onNavigate={(key) => navigate(NAV_PATHS[key] || '/')} />
    </div>
  );
}
