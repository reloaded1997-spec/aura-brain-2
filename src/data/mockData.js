// =============================================================================
// data/mockData.js — Dummy data for the dumb UI (Phase 3)
// -----------------------------------------------------------------------------
// Shapes follow the Firestore schema (ARCHITECTURE.md §4) — id, uid,
// priorityRate, lastClearedDate — PLUS a few presentational helpers the design
// needs (initial, sub, kind, priorityLabel, requestCount). No backend here;
// these feed the components via props only.
//
// Cycle rates (days) map to priority labels for display:
//   3 -> High · 7 -> Medium · 14/30 -> Low · groups read as "Group".
// =============================================================================

const UID = 'demo-user';

// ----- Habits (daily rhythm strip) ------------------------------------------
// `done` drives the checked/faded state; permanent streaks + one time-boxed
// challenge (type: 'temporary') per the design's habit banner.
export const mockHabits = [
  { id: 'h1', uid: UID, title: 'Read the Bible', type: 'permanent', currentStreak: 42, done: true },
  { id: 'h2', uid: UID, title: 'Work out',       type: 'permanent', currentStreak: 9,  done: false },
  { id: 'h3', uid: UID, title: 'Clean car',      type: 'permanent', currentStreak: 3,  done: false },
  {
    id: 'h4',
    uid: UID,
    title: 'Read the Gospels',
    type: 'temporary',
    currentStreak: 18,
    targetCount: 28,
    done: false,
  },
];

// ----- Groups ----------------------------------------------------------------
export const mockGroups = [
  {
    id: 'grp_fresno',
    uid: UID,
    name: 'Fresno Home Church',
    priorityRate: 7,
    lastClearedDate: '2026-06-05',
    // display helpers
    initial: 'F',
    memberCount: 12,
    sub: '12 people · pray as one body',
    priorityLabel: 'Group',
  },
];

// ----- Profiles --------------------------------------------------------------
// Mix of standalone (groupId: null) and nested (groupId: 'grp_fresno').
// `kind` distinguishes round-avatar people from rounded-square standalone
// requests (design §01). Nested profiles ride their group's cadence.
export const mockProfiles = [
  // --- Standalone people & requests (surface individually in the queue) ---
  {
    id: 'p_marcus', uid: UID, name: 'Marcus Bell', groupId: null,
    priorityRate: 3, lastClearedDate: '2026-06-09',
    kind: 'person', initial: 'M', sub: 'Job search · walking back to faith',
    priorityLabel: 'High', requestCount: 2,
  },
  {
    id: 'p_joan', uid: UID, name: 'Healing for Joan', groupId: null,
    priorityRate: 7, lastClearedDate: '2026-06-04',
    kind: 'request', initial: '✦', sub: 'Standalone request · my aunt',
    priorityLabel: 'Medium', requestCount: 0,
  },
  {
    id: 'p_dad', uid: UID, name: 'Dad', groupId: null,
    priorityRate: 3, lastClearedDate: '2026-06-08',
    kind: 'person', initial: 'D', sub: 'Salvation · ongoing',
    priorityLabel: 'High', requestCount: 1,
  },
  {
    id: 'p_elena', uid: UID, name: 'Elena Ruiz', groupId: null,
    priorityRate: 7, lastClearedDate: '2026-06-03',
    kind: 'person', initial: 'E', sub: 'New believer · discipleship',
    priorityLabel: 'Medium', requestCount: 1,
  },
  {
    id: 'p_okafors', uid: UID, name: 'The Okafors', groupId: null,
    priorityRate: 14, lastClearedDate: '2026-05-30',
    kind: 'person', initial: 'O', sub: 'Marriage · expecting in fall',
    priorityLabel: 'Low', requestCount: 0,
  },

  // --- Members of grp_fresno (surface via the group, never individually) ---
  {
    id: 'm_rosa', uid: UID, name: 'Rosa Delgado', groupId: 'grp_fresno',
    priorityRate: 14, lastClearedDate: '2026-06-05',
    kind: 'person', initial: 'R', sub: 'Hosting · needs encouragement', requestCount: 0,
  },
  {
    id: 'm_james', uid: UID, name: 'James Okafor', groupId: 'grp_fresno',
    priorityRate: 14, lastClearedDate: '2026-06-05',
    kind: 'person', initial: 'J', sub: 'Started a new job', requestCount: 0,
  },
  {
    id: 'm_priya', uid: UID, name: 'Priya N.', groupId: 'grp_fresno',
    priorityRate: 14, lastClearedDate: '2026-06-05',
    kind: 'person', initial: 'P', sub: 'Baptism this month', requestCount: 0,
  },
  {
    id: 'm_samkate', uid: UID, name: 'Sam & Kate', groupId: 'grp_fresno',
    priorityRate: 14, lastClearedDate: '2026-06-05',
    kind: 'person', initial: 'S', sub: 'Leading the group', requestCount: 0,
  },
];

// ----- Profile detail data (requests + relational log) -----------------------
// Keyed by profile id. `requests` mirror the profiles/{id}/requests subcollection
// ({ text, isCompleted }); `logs` mirror profiles/{id}/logs ({ text, timestamp }).
// `fromJournal` marks an entry that the second-brain pipeline routed in (§6).
// Marcus is fully fleshed out per design §03; others get lighter placeholders.
const profileDetails = {
  p_marcus: {
    role: 'Brother in Christ · Fresno Home Church',
    lastPrayedLabel: 'Last prayed 2 days ago',
    requests: [
      { id: 'r1', text: 'Wisdom for the job interview Thursday', isCompleted: false },
      { id: 'r2', text: 'Reconciliation with his brother', isCompleted: false },
      { id: 'r3', text: 'That he would return to the Word daily', isCompleted: true },
    ],
    logs: [
      {
        id: 'l1',
        date: 'Jun 9',
        fromJournal: true,
        text: 'He’s anxious about Thursday’s interview — auto-added “wisdom for the interview” to his requests.',
      },
      {
        id: 'l2',
        date: 'Jun 4',
        fromJournal: false,
        text: 'Coffee after service. Started opening up about the rift with his brother.',
      },
      {
        id: 'l3',
        date: 'May 28',
        fromJournal: false,
        text: 'First time back at home church in months.',
      },
    ],
  },
  p_dad: {
    role: 'Father · walking toward faith',
    lastPrayedLabel: 'Last prayed 4 days ago',
    requests: [{ id: 'r1', text: 'Softened heart toward the gospel', isCompleted: false }],
    logs: [
      { id: 'l1', date: 'Jun 7', fromJournal: false, text: 'Long call about Grandpa. He listened when faith came up.' },
    ],
  },
  p_elena: {
    role: 'New believer · discipleship',
    lastPrayedLabel: 'Last prayed 9 days ago',
    requests: [{ id: 'r1', text: 'Rooted in a daily rhythm of prayer', isCompleted: false }],
    logs: [
      { id: 'l1', date: 'Jun 2', fromJournal: false, text: 'Asked great questions about baptism after Bible study.' },
    ],
  },
};

// ----- Journal capture draft -------------------------------------------------
// A single in-progress entry the way the design §05 demos it: free text plus
// the entities Aura "recognized" and the prayer requests it offered to route.
// In production these detections come from the Cloud Function / Anthropic
// pipeline (§6); here they're static so the UI is fully demoable offline.
export const mockJournalDraft = {
  text:
    "Caught up with Marcus after Fresno Home Church tonight. He's nervous about " +
    "Thursday's interview and still feeling the weight of the move. We prayed " +
    "together — first time he's asked to in a while.",
  subjectName: 'Marcus',
  subjectFullName: 'Marcus Bell',
  detected: [
    { id: 'd1', text: "Wisdom for Thursday's interview", confirmed: true },
    { id: 'd2', text: 'Peace about the weight of the move', confirmed: true },
  ],
  entities: [
    { id: 'p_marcus', initial: 'M', name: 'Marcus Bell', kind: 'person' },
    { id: 'grp_fresno', initial: 'F', name: 'Fresno Home Church', kind: 'group' },
  ],
};

// Lookup helper — returns a safe default so the page never renders empty.
export function getProfileDetail(id) {
  return (
    profileDetails[id] || {
      role: 'In your network',
      lastPrayedLabel: 'Not yet prayed',
      requests: [],
      logs: [],
    }
  );
}

export { profileDetails };

export default {
  mockHabits,
  mockGroups,
  mockProfiles,
  profileDetails,
  getProfileDetail,
  mockJournalDraft,
};
