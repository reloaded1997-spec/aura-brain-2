# Deploying Aura Brain

This app has **two halves that deploy separately**:

| Part | Lives on | Deploys when |
| --- | --- | --- |
| Frontend (the React/Vite app in `src/`) | **Vercel** | you `git push` to `main` |
| Backend (`functions/`, `firestore.rules`) | **Firebase** | you run a `firebase deploy` command |

A `git push` updates the website. It does **not** touch the Cloud Function or
Firestore rules — those are a separate command.

---

## Everyday workflow (shipping a UI change)

From the project folder:

```bash
npm run dev          # test at http://localhost:5173 FIRST
# ...make changes, confirm they work...
git add -A
git commit -m "describe what changed"
git push             # Vercel auto-builds & deploys main
```

Watch the build in the Vercel dashboard → **Deployments**. When it goes green,
your `*.vercel.app` URL is updated. A failed build leaves the last good deploy
live, so a bad push can't take the site down.

### Safe previews (optional)

Pushing any branch other than `main` gives you a separate **Preview** URL
instead of touching production:

```bash
git checkout -b try-something
git push -u origin try-something   # Vercel posts a preview link
# merge into main (or open a PR) when you're happy
```

---

## Deploying backend changes

Run these only when you change files in `functions/` or `firestore.rules`.

```bash
# Cloud Function (journal-to-profile routing)
npx firebase deploy --only functions

# Firestore security rules
npx firebase deploy --only firestore:rules

# Both at once
npx firebase deploy --only functions,firestore:rules
```

Check function logs:

```bash
npx firebase functions:log --only routeJournalEntry
```

---

## Environment variables & secrets

These are **not** in git (by design) and must be set in their host:

- **Frontend (`VITE_FIREBASE_*`)** → Vercel **Settings → Environment Variables**.
  Vite inlines these at *build time*, so after adding/changing one you must
  **redeploy** (Deployments → ⋯ → Redeploy) for it to take effect.
  Locally these come from `.env` (copy `.env.example` → `.env`).
- **`GEMINI_API_KEY`** → Google Secret Manager, set once with:
  ```bash
  npx firebase functions:secrets:set GEMINI_API_KEY
  ```
  Then redeploy functions so the new value binds.

Required `VITE_*` keys:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

---

## One-time setup (already done, here for reference)

- **New Vercel domain** → add it under Firebase Console → **Authentication →
  Settings → Authorized domains**, or sign-in fails with
  `auth/unauthorized-domain`.
- **Invite codes** → gated signup requires a doc in the `inviteCodes`
  collection. Seed with `npm run seed:invites` (needs
  `GOOGLE_APPLICATION_CREDENTIALS` pointing at a service-account key).
- **Billing** → the Cloud Function (outbound Gemini call, 2nd gen) requires the
  Firebase **Blaze** plan.

---

## Quick troubleshooting

| Symptom | Fix |
| --- | --- |
| `Missing VITE_FIREBASE_*` / `auth/invalid-api-key` on the live site | Env vars missing in Vercel, or set but not redeployed. Add them, then redeploy. |
| `auth/unauthorized-domain` on login | Add the Vercel domain to Firebase Authorized domains. |
| Deep link / refresh on `/journal` 404s | `vercel.json` rewrite handles this — confirm it's committed. |
| `git push` rejected / `index.lock` exists | `rm -f .git/index.lock`, then retry. |
| Journal saved but profile didn't update | Check `functions:log`; entry marked `aiProcessed: 'error'` means Gemini/JSON failed. |
| Changed a function but live behavior is stale | Functions don't deploy via git — run `npx firebase deploy --only functions`. |
