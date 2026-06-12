// =============================================================================
// scripts/seedInviteCodes.js — Seed the inviteCodes collection (Phase 2 helper)
// -----------------------------------------------------------------------------
// `inviteCodes` is write-locked for clients (firestore.rules), so codes must be
// provisioned server-side. This uses the Firebase Admin SDK, which bypasses
// security rules.
//
// SETUP (one time):
//   1. Firebase Console -> Project settings -> Service accounts ->
//      "Generate new private key". Save the JSON somewhere OUTSIDE the repo.
//   2. Point an env var at it:
//        export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/serviceAccount.json
//   3. npm install -D firebase-admin
//
// USAGE:
//   node scripts/seedInviteCodes.js                 # seeds the DEFAULT_CODES
//   node scripts/seedInviteCodes.js GRACE2026 ABIDE  # seeds the codes you pass
//
// The document ID IS the code string (matches the gated-signup lookup in
// AuthContext: getDoc(doc(db, 'inviteCodes', code))).
// =============================================================================

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Codes to seed when none are passed on the command line.
const DEFAULT_CODES = ['WELCOME', 'ABIDE2026', 'FIRSTFRUITS'];

async function main() {
  const codes = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_CODES;

  initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  console.log(`Seeding ${codes.length} invite code(s)…\n`);

  const batch = db.batch();
  for (const raw of codes) {
    const code = raw.trim();
    if (!code) continue;
    // merge:true keeps re-runs idempotent (won't clobber an existing doc).
    batch.set(
      db.collection('inviteCodes').doc(code),
      { createdAt: FieldValue.serverTimestamp(), active: true },
      { merge: true }
    );
    console.log(`  + inviteCodes/${code}`);
  }

  await batch.commit();
  console.log('\n✓ Done. These codes are now valid for gated signup.');
}

main().catch((err) => {
  console.error('\n✗ Seed failed:', err.message);
  process.exit(1);
});
