// VITE_FCM_VAPID_KEY — add to .env.local (Firebase Console →
// Project settings → Cloud Messaging → Web Push certificates → Key pair).
// Example:  VITE_FCM_VAPID_KEY=BNsKa5...

import { getMessaging, getToken } from 'firebase/messaging';
import app from '../firebase/config';
import { saveFcmToken as dbSaveFcmToken, removeFcmToken as dbRemoveFcmToken } from '../firebase/db';

export async function requestNotificationPermission(uid) {
  if (!('Notification' in window)) return { granted: false, token: null };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { granted: false, token: null };

  try {
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FCM_VAPID_KEY,
    });
    if (token) await dbSaveFcmToken(uid, token);
    return { granted: true, token: token ?? null };
  } catch (err) {
    console.error('[notifications] Failed to get FCM token:', err);
    return { granted: true, token: null };
  }
}

export async function removeFcmToken(uid, token) {
  if (!uid || !token) return;
  try {
    await dbRemoveFcmToken(uid, token);
  } catch (err) {
    console.error('[notifications] Failed to remove FCM token:', err);
  }
}
