// =============================================================================
// context/AuthContext.jsx — Authentication state + gated signup (Phase 2)
// -----------------------------------------------------------------------------
// Exposes: user, loading, login, logout, signup via the useAuth() hook.
// State management is React Context + a custom hook (per ARCHITECTURE.md §2 —
// no Redux, no Zustand).
// =============================================================================

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { watchUserDoc, updateUserDoc, seedStarterProfile } from '../firebase/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until first auth resolution

  // The live users/{uid} account doc (name, birthday, createdAt, settings).
  const [userDoc, setUserDoc] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // ----- Auth state listener ------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe; // detach on unmount
  }, []);

  // ----- Account-doc listener -----------------------------------------------
  // Mirrors the signed-in user's users/{uid} doc so identity is available app-
  // wide (and the completion prompt can tell when it's still missing).
  useEffect(() => {
    if (!user) {
      setUserDoc(null);
      setProfileLoading(false);
      return undefined;
    }
    setProfileLoading(true);
    const unsub = watchUserDoc(user.uid, (d) => {
      setUserDoc(d);
      setProfileLoading(false);
    });
    return unsub;
  }, [user]);

  // ----- Login --------------------------------------------------------------
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // ----- Logout -------------------------------------------------------------
  function logout() {
    return signOut(auth);
  }

  // ----- Password reset -----------------------------------------------------
  // Firebase emails a reset link and hosts the reset page itself.
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // ----- Gated Signup (ARCHITECTURE.md §3C) ---------------------------------
  // Order matters:
  //   1. Validate the invite code against Firestore BEFORE touching Auth.
  //   2. Only on a valid code, create the auth user.
  //   3. Immediately provision the users/{uid} profile doc.
  async function signup(email, password, inviteCode, profile = {}) {
    const code = (inviteCode || '').trim();
    if (!code) {
      throw new Error('Invalid invite code');
    }

    // 1. Gate: the doc ID in `inviteCodes` must equal the supplied code.
    const inviteRef = doc(db, 'inviteCodes', code);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) {
      throw new Error('Invalid invite code');
    }

    // 2. Code is valid -> create the auth user.
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid } = credential.user;

    // 3. Provision the user document with identity + account-creation date.
    const identity = {
      firstName: (profile.firstName || '').trim(),
      lastName: (profile.lastName || '').trim(),
      birthMonth: profile.birthMonth ? Number(profile.birthMonth) : null,
      birthDay: profile.birthDay ? Number(profile.birthDay) : null,
    };
    await setDoc(doc(db, 'users', uid), {
      email,
      ...identity,
      createdAt: serverTimestamp(),
      settings: {},
    });

    // 4. Seed a starter network card from their identity (empty-network guarded).
    //    Best-effort: a failure here must not fail an otherwise-successful signup.
    try {
      await seedStarterProfile(uid, identity);
    } catch {
      /* non-fatal — they can still add their own people */
    }

    return credential;
  }

  // ----- Update the account doc (used by the completion prompt) -------------
  // Numbers are coerced so birth month/day store identically to signup.
  async function updateUserProfile(patch) {
    if (!user) throw new Error('Not signed in');
    const out = { ...patch };
    if ('firstName' in out) out.firstName = (out.firstName || '').trim();
    if ('lastName' in out) out.lastName = (out.lastName || '').trim();
    if ('birthMonth' in out) out.birthMonth = out.birthMonth ? Number(out.birthMonth) : null;
    if ('birthDay' in out) out.birthDay = out.birthDay ? Number(out.birthDay) : null;
    await updateUserDoc(user.uid, out);

    // A legacy member just supplied their identity — seed the starter card too
    // (no-ops if their network already has cards). Best-effort, non-fatal.
    try {
      await seedStarterProfile(user.uid, { ...userDoc, ...out });
    } catch {
      /* non-fatal */
    }
  }

  const value = {
    user,
    userDoc,
    loading,
    profileLoading,
    login,
    logout,
    signup,
    resetPassword,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Convenience hook with a guard so misuse fails loudly.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}

export default AuthContext;
