// =============================================================================
// functions/index.js — Journal → profile routing via Gemini (Phase 5.2)
// -----------------------------------------------------------------------------
// Trigger: a new doc in `journals` (2nd-gen Firestore trigger).
// Job: send the entry to Gemini (gemini-1.5-flash), which extracts the people
// named and a derived prayer request / relational note for each. We match each
// extracted name to one of the SAME USER's profiles and write the request into
// that profile's `requests` subcollection, then mark the journal aiProcessed.
//
// uid ISOLATION: every profile lookup is filtered by `uid == journal.uid`, so a
// journal can only ever route to its own author's profiles. No cross-tenant
// writes are possible even if Gemini returns a name that exists for another user.
//
// Uses the current Google Gen AI SDK (`@google/genai`). The GEMINI_API_KEY is a
// Secret Manager secret (defineSecret) bound to this function only.
// =============================================================================

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { GoogleGenAI } = require('@google/genai');

initializeApp();
const db = getFirestore();

// Secret — set with: firebase functions:secrets:set GEMINI_API_KEY
const geminiApiKey = defineSecret('GEMINI_API_KEY');

// --- Strict extraction system prompt ----------------------------------------
const SYSTEM_PROMPT = `You are a Data Extraction Assistant for a prayer-journaling app.

You read a single journal entry and extract the people mentioned and, for each,
the specific prayer request or relational note derived from the text.

RULES:
- Return ONLY a strict, valid JSON object. No markdown, no code fences, no
  commentary, no explanation — JSON and nothing else.
- The JSON MUST match this exact schema:
  { "extractedData": [ { "name": "Exact Name Mentioned", "request": "The specific prayer request or derived relational note" } ] }
- "name" must be the name exactly as it appears in the entry (e.g. "Marcus",
  "Marcus Bell", "Fresno Home Church"). Do not invent or normalize names.
- "request" must be a concise, specific request or note grounded in the text.
  Never fabricate details that are not present.
- If a person is mentioned but no request/note can be derived, omit them.
- If no names or requests are found, return { "extractedData": [] }.`;

// --- Robust JSON parsing -----------------------------------------------------
// Gemini is asked for raw JSON, but we defensively strip stray code fences and
// validate the shape so a hallucinated response can never crash us.
function parseExtraction(raw) {
  if (!raw || typeof raw !== 'string') return { extractedData: [] };
  let cleaned = raw.trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    // Last-ditch: grab the first {...} block and try again.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`Unparseable model output: ${cleaned.slice(0, 200)}`);
    parsed = JSON.parse(match[0]);
  }

  const items = Array.isArray(parsed?.extractedData) ? parsed.extractedData : [];
  return {
    extractedData: items
      .filter((it) => it && typeof it.name === 'string' && typeof it.request === 'string')
      .map((it) => ({ name: it.name.trim(), request: it.request.trim() }))
      .filter((it) => it.name && it.request),
  };
}

// --- Forgiving name matching -------------------------------------------------
// Tiered match against the user's OWN profiles (already uid-scoped by the
// caller, so isolation is preserved):
//   1. exact, case-insensitive full-name match;
//   2. token overlap — "Marcus" -> "Marcus Bell", "the Okafors" -> "The Okafors";
//      when several profiles share a token we pick the one with the MOST
//      overlapping tokens, and only if that best score is unambiguous (a single
//      clear winner) — ties are skipped so we never route to the wrong person.
// Returns the matched profile, or null.
function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s&]/g, '') // drop punctuation
    .trim();
}

function tokensOf(name) {
  return normalizeName(name)
    .split(/[\s&]+/)
    .filter((t) => t.length > 2); // ignore tiny words like "of", "&", initials
}

function matchProfile(profiles, extractedName) {
  const target = normalizeName(extractedName);
  if (!target) return null;

  // Tier 1 — exact (case-insensitive) full name.
  const exact = profiles.find((p) => normalizeName(p.name) === target);
  if (exact) return exact;

  // Tier 2 — token overlap, scored.
  const targetTokens = new Set(tokensOf(extractedName));
  if (targetTokens.size === 0) return null;

  let best = null;
  let bestScore = 0;
  let bestIsTie = false;

  for (const p of profiles) {
    const pTokens = tokensOf(p.name);
    const score = pTokens.filter((t) => targetTokens.has(t)).length;
    if (score === 0) continue;
    if (score > bestScore) {
      best = p;
      bestScore = score;
      bestIsTie = false;
    } else if (score === bestScore) {
      bestIsTie = true; // another profile is equally good -> ambiguous
    }
  }

  // Only accept an unambiguous winner.
  return best && !bestIsTie ? best : null;
}

// --- Gemini call -------------------------------------------------------------
async function extractWithGemini(text) {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: text,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0, // deterministic extraction
      responseMimeType: 'application/json', // ask for raw JSON, not prose
    },
  });
  return parseExtraction(response.text);
}

exports.routeJournalEntry = onDocumentCreated(
  { document: 'journals/{journalId}', secrets: [geminiApiKey] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const journal = snap.data() || {};
    const { uid, text, aiProcessed } = journal;
    const journalId = event.params.journalId;

    if (aiProcessed) return; // idempotent guard
    if (!uid || !text) {
      console.error('journal missing uid/text — marking error', { journalId });
      await snap.ref.update({ aiProcessed: 'error', aiError: 'missing uid or text' }).catch(() => {});
      return;
    }

    try {
      // 1) Extract with Gemini.
      const { extractedData } = await extractWithGemini(text);
      console.log(`[${journalId}] gemini extracted ${extractedData.length} item(s)`);

      // 2) Load THIS USER's profiles once (uid filter = isolation), then match
      //    each extracted name against them in memory with forgiving logic.
      const profilesSnap = await db.collection('profiles').where('uid', '==', uid).get();
      const profiles = profilesSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

      const linkedProfileIds = new Set();

      for (const item of extractedData) {
        const profile = matchProfile(profiles, item.name);
        if (!profile) {
          console.log(`[${journalId}] no profile match for "${item.name}"`);
          continue;
        }

        const profileRef = profile.ref;
        const stamp = FieldValue.serverTimestamp();

        // The derived prayer request.
        await profileRef.collection('requests').add({
          text: item.request,
          isCompleted: false,
          createdAt: stamp,
          fromJournal: true,
          journalId,
        });

        // Append a From-Journal entry to the relational log (design §6) and keep
        // the denormalized open-request counter in sync with the client UI.
        await profileRef.collection('logs').add({
          text,
          timestamp: stamp,
          fromJournal: true,
          journalId,
        });
        await profileRef.update({ openRequestCount: FieldValue.increment(1) });

        linkedProfileIds.add(profileRef.id);
      }

      // 3) Mark the journal processed.
      await snap.ref.update({
        aiProcessed: true,
        linkedProfileIds: [...linkedProfileIds],
        processedAt: FieldValue.serverTimestamp(),
      });
      console.log(`[${journalId}] routed to ${linkedProfileIds.size} profile(s)`);
    } catch (err) {
      // Robust failure handling: log loudly, mark 'error' so a bad/hallucinated
      // response or API outage never loops or crashes silently.
      console.error(`[${journalId}] journal routing failed:`, err);
      await snap.ref
        .update({ aiProcessed: 'error', aiError: err.message || 'unknown error' })
        .catch((markErr) => console.error(`[${journalId}] failed to mark error:`, markErr));
    }
  }
);
