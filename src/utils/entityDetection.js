// =============================================================================
// utils/entityDetection.js — Pure, synchronous local entity detection
// -----------------------------------------------------------------------------
// Matches journal text against the user's own profiles, groups, and active
// habits using the same normalization/tokenisation as functions/index.js.
// Called on every debounced keystroke — no AI, no async, no side effects.
// =============================================================================

// Mirror of normalizeName / tokensOf in functions/index.js.
function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s&]/g, '')
    .trim();
}

function tokensOf(name) {
  return normalizeName(name)
    .split(/[\s&]+/)
    .filter((t) => t.length > 2);
}

function initialOf(name) {
  return (name || '').trim().charAt(0).toUpperCase() || '?';
}

// Returns true when the entity name matches against the journal text.
// Two tiers:
//   1. Token match — all significant name tokens appear in the text token set.
//   2. Substring match — the full normalized name is a substring of the
//      normalized text (min 3 chars to avoid false positives on tiny words).
function matchesInText(entityName, normalizedText, textTokenSet) {
  const tokens = tokensOf(entityName);

  if (tokens.length > 0 && tokens.every((t) => textTokenSet.has(t))) {
    return true;
  }

  const normalizedEntity = normalizeName(entityName);
  if (normalizedEntity.length >= 3 && normalizedText.includes(normalizedEntity)) {
    return true;
  }

  return false;
}

// Build the text token set once per call (text is the full journal entry).
function buildTextTokenSet(text) {
  return new Set(tokensOf(text));
}

// ---------------------------------------------------------------------------
// detectPrayerRequests(text, profiles) → PrayerDetection[]
//
// PrayerDetection = { profileId, profileName, prayerText }
//
// Scans for "pray for / prayers for / praying for / prayer for" patterns and
// matches the captured phrase against the user's profiles. Uses the same
// conservative token matching as detectEntities.
// ---------------------------------------------------------------------------
export function detectPrayerRequests(text, profiles = []) {
  if (!text || !text.trim()) return [];

  const results = [];
  const seen = new Set();
  // Capture up to 100 chars after the keyword, stopping at sentence boundaries.
  const regex = /\bpray(?:ers?|ing)?\s+for\s+([^.!?\n]{3,100})/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const captured = match[1].trim().replace(/[,;]\s*$/, '');
    const normalizedCapture = normalizeName(captured);
    const captureTokens = buildTextTokenSet(captured);
    for (const profile of profiles) {
      if (!profile.name || seen.has(profile.id)) continue;
      if (matchesInText(profile.name, normalizedCapture, captureTokens)) {
        seen.add(profile.id);
        results.push({ profileId: profile.id, profileName: profile.name, prayerText: captured });
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// detectEntities(text, profiles, groups, habits) → DetectedEntity[]
//
// DetectedEntity = { id, kind: 'profile'|'group'|'habit', name, initial }
//
// Dedupes by id. Only matches active habits (status === 'active').
// ---------------------------------------------------------------------------
export function detectEntities(text, profiles = [], groups = [], habits = []) {
  if (!text || !text.trim()) return [];

  const normalizedText = normalizeName(text);
  const textTokens = buildTextTokenSet(text);

  const seen = new Set();
  const results = [];

  for (const profile of profiles) {
    if (!profile.name || seen.has(profile.id)) continue;
    if (matchesInText(profile.name, normalizedText, textTokens)) {
      seen.add(profile.id);
      results.push({ id: profile.id, kind: 'profile', name: profile.name, initial: initialOf(profile.name) });
    }
  }

  for (const group of groups) {
    if (!group.name || seen.has(group.id)) continue;
    if (matchesInText(group.name, normalizedText, textTokens)) {
      seen.add(group.id);
      results.push({ id: group.id, kind: 'group', name: group.name, initial: initialOf(group.name) });
    }
  }

  for (const habit of habits) {
    if (!habit.title || habit.status !== 'active' || seen.has(habit.id)) continue;
    if (matchesInText(habit.title, normalizedText, textTokens)) {
      seen.add(habit.id);
      results.push({ id: habit.id, kind: 'habit', name: habit.title, initial: initialOf(habit.title) });
    }
  }

  return results;
}
