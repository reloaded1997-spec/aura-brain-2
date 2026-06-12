// =============================================================================
// pages/DashboardPage.jsx — The Daily Queue (Phase 4: live data)
// -----------------------------------------------------------------------------
// Now backed by Firestore via useData(). The load balancer (generateDailyQueue,
// §3B) decides who surfaces; completing a card/group/ habit writes through to
// Firestore, and the onSnapshot listeners reflect the change everywhere.
//
// Completion timing: each card runs its own collapse animation FIRST, then its
// onComplete fires the write — so the animation plays before the snapshot drops
// the item from the due list.
// =============================================================================

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { TopHeader, BottomNav } from '../components/Navigation';
import HabitStrip from '../components/HabitStrip';
import ProfileCard from '../components/ProfileCard';
import GroupAccordion from '../components/GroupAccordion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateDailyQueue, getTodayLocal } from '../utils/queueMath';
import { decorateProfile, decorateGroup } from '../utils/display';

function todayEyebrow() {
  const d = new Date();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  return `${weekday} · ${month} ${d.getDate()}`;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { habits, groups, profiles, loading, clearProfile, clearGroup, toggleHabit } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('queue');

  const today = getTodayLocal();

  const handleNavigate = (key) => {
    setActiveTab(key);
    if (key === 'journal') navigate('/journal');
    else if (key === 'network') navigate('/network');
  };

  // --- Habits: derive today's done state from lastCompletedDate -------------
  const habitView = useMemo(
    () =>
      habits.map((h) => ({
        ...h,
        done: h.lastCompletedDate === today,
      })),
    [habits, today]
  );
  const habitDoneToday = habitView.filter((h) => h.type !== 'temporary' && h.done).length;

  // --- Load-balanced due queue ---------------------------------------------
  const { dueGroups, dueProfiles } = useMemo(() => {
    const result = generateDailyQueue(profiles, groups, today);
    const byId = (arr, id) => arr.find((x) => x.id === id);

    return {
      dueGroups: result.groups.map((g) => {
        const original = byId(groups, g.id);
        const members = profiles.filter((p) => p.groupId === g.id);
        return {
          group: decorateGroup(original, members.length),
          members: members.map(decorateProfile),
        };
      }),
      dueProfiles: result.profiles.map((p) => decorateProfile(byId(profiles, p.id))),
    };
  }, [profiles, groups, today]);

  const remaining = dueGroups.length + dueProfiles.length;

  // Progress: cleared-today vs the day's full surfaced set (cleared + due).
  const clearedToday =
    profiles.filter((p) => !p.groupId && p.lastClearedDate === today).length +
    groups.filter((g) => g.lastClearedDate === today).length;
  const total = clearedToday + remaining;

  // Interleave the group(s) among the people, like the design.
  const queueItems = [];
  dueProfiles.forEach((p, i) => {
    queueItems.push({ type: 'profile', data: p });
    if (i === 1) dueGroups.forEach((g) => queueItems.push({ type: 'group', data: g }));
  });
  if (dueProfiles.length < 2) dueGroups.forEach((g) => queueItems.push({ type: 'group', data: g }));

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F3] text-[#26241F]">
      <TopHeader
        eyebrow={todayEyebrow()}
        title="Today"
        initial={(user?.email?.[0] || 'A').toUpperCase()}
        cleared={clearedToday}
        total={total || 0}
      />

      <HabitStrip habits={habitView} onCheck={(id) => toggleHabit(habits.find((h) => h.id === id))} />

      <main className="flex-1 px-4 pt-4">
        <div className="mb-[11px] flex items-baseline justify-between px-[2px]">
          <span className="text-[10px] font-semibold uppercase tracking-[1.8px] text-[#9A958A]">
            The Queue
          </span>
          <span className="text-[11px] text-[#9A958A]">{remaining} surfaced today</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-[#B6B0A2]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div>
            {queueItems.map((item) =>
              item.type === 'group' ? (
                <GroupAccordion
                  key={item.data.group.id}
                  group={item.data.group}
                  nestedProfiles={item.data.members}
                  onCompleteGroup={(gid) =>
                    clearGroup(gid, item.data.members.map((m) => m.id))
                  }
                />
              ) : (
                <ProfileCard
                  key={item.data.id}
                  profile={item.data}
                  onComplete={clearProfile}
                  onOpen={(pid) => navigate(`/profile/${pid}`)}
                />
              )
            )}

            {remaining === 0 && (
              <div className="my-10 text-center font-['Newsreader'] text-[15px] italic text-[#B6B0A2]">
                {profiles.length === 0
                  ? 'No one in your network yet — add someone from the Network tab.'
                  : 'When the queue is clear, rest.'}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 mb-4 text-center">
          <button
            type="button"
            onClick={logout}
            className="text-[12px] text-[#A8A294] underline underline-offset-4 hover:text-[#6F6A60]"
          >
            Sign out
          </button>
        </div>
      </main>

      <BottomNav active={activeTab} onNavigate={handleNavigate} />
    </div>
  );
}
