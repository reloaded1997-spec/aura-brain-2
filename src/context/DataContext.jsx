// =============================================================================
// context/DataContext.jsx — Live Firestore data + actions (Phase 4)
// -----------------------------------------------------------------------------
// Subscribes (onSnapshot) to the signed-in user's habits, groups, and profiles
// and exposes them — plus write actions — through the useData() hook. State is
// React Context + a custom hook (no Redux/Zustand, per §2).
//
// Subcollection reads (requests/logs) are subscribed per-screen, not here, to
// avoid fanning out listeners across every profile at once.
// =============================================================================

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import * as dbApi from '../firebase/db';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();

  const [habits, setHabits] = useState([]);
  const [groups, setGroups] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setGroups([]);
      setProfiles([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    let gotProfiles = false;

    const unsubs = [
      dbApi.watchHabits(user.uid, setHabits),
      dbApi.watchGroups(user.uid, setGroups),
      dbApi.watchProfiles(user.uid, (p) => {
        setProfiles(p);
        if (!gotProfiles) {
          gotProfiles = true;
          setLoading(false); // first real payload in — we're ready
        }
      }),
    ];

    return () => unsubs.forEach((u) => u && u());
  }, [user]);

  // Actions bound to the current uid so callers pass only the payload.
  const actions = useMemo(
    () => ({
      addProfile: (data) => dbApi.addProfile(user.uid, data),
      updateProfile: dbApi.updateProfile,
      deleteProfile: dbApi.deleteProfile,
      clearProfile: dbApi.clearProfile,
      addGroup: (data) => dbApi.addGroup(user.uid, data),
      updateGroup: dbApi.updateGroup,
      deleteGroup: dbApi.deleteGroup,
      clearGroup: dbApi.clearGroup,
      addHabit: (data) => dbApi.addHabit(user.uid, data),
      updateHabit: dbApi.updateHabit,
      deleteHabit: dbApi.deleteHabit,
      toggleHabit: dbApi.toggleHabit,
      addJournalEntry: (text) => dbApi.addJournalEntry(user.uid, text),
      updateProfileNotes: dbApi.updateProfileNotes,
    }),
    [user]
  );

  const value = { habits, groups, profiles, loading, ...actions };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (ctx === null) throw new Error('useData must be used within a <DataProvider>');
  return ctx;
}

export default DataContext;
