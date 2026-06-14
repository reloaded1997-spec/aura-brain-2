// =============================================================================
// hooks/useSettings.js — Typed settings derived from users/{uid}.settings
// -----------------------------------------------------------------------------
// Reads from AuthContext's live userDoc (already onSnapshot'd) so no extra
// Firestore listener is needed. Writes go through updateUserSettings with a
// 500ms debounce for text fields; callers that need an immediate write (toggles,
// selects) can use saveSettingNow.
// =============================================================================

import { useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserSettings } from '../firebase/db';

export const SETTINGS_DEFAULTS = {
  displayName: '',
  defaultPriorityRate: 7,
  notificationsEnabled: false,
  eveningReminderEnabled: false,
  eveningReminderTime: '20:00',
  showAnswered: true,
  fontScale: 'medium',
  darkMode: false,
};

export function useSettings() {
  const { user, userDoc } = useAuth();
  const timers = useRef({});

  const settings = { ...SETTINGS_DEFAULTS, ...(userDoc?.settings ?? {}) };

  const saveSetting = useCallback(
    (key, value) => {
      if (!user) return;
      clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => {
        updateUserSettings(user.uid, { [key]: value });
      }, 500);
    },
    [user]
  );

  const saveSettingNow = useCallback(
    (key, value) => {
      if (!user) return;
      clearTimeout(timers.current[key]);
      updateUserSettings(user.uid, { [key]: value });
    },
    [user]
  );

  return { settings, saveSetting, saveSettingNow };
}
