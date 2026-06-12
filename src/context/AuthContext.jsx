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
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until first auth resolution

  // ----- Auth state listener ------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe; // detach on unmount
  }, []);

  // ----- Login --------------------------------------------------------------
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // ----- Logout -------------------------------------------------------------
  function logout() {
    return signOut(auth);
  }

  // ----- Gated Signup (ARCHITECTURE.md §3C) ---------------------------------
  // Order matters:
  //   1. Validate the invite code against Firestore BEFORE touching Auth.
  //   2. Only on a valid code, create the auth user.
  //   3. Immediately provision the users/{uid} profile doc.
  async function signup(email, password, inviteCode) {
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

    // 3. Provision the user document.
    await setDoc(doc(db, 'users', uid), {
      email,
      createdAt: serverTimestamp(),
      settings: {},
    });

    return credential;
  }

  const value = { user, loading, login, logout, signup };

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
