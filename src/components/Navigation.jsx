// =============================================================================
// components/Navigation.jsx — Global header + bottom PWA nav (Phase 3, dumb)
// -----------------------------------------------------------------------------
// Two sticky chrome pieces (ARCHITECTURE.md §5), both purely presentational:
//   <TopHeader>  — sticky top: date eyebrow, "Today" title, user avatar, and a
//                  load-progress bar.
//   <BottomNav>  — sticky bottom: Queue · Network · Journal · Search.
//
// No Firebase, no router — everything arrives via props so this stays a dumb
// component. onNavigate(key) lets a parent wire routing later.
// =============================================================================

import { Inbox, Users, NotebookPen, Search } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'queue', label: 'Queue', Icon: Inbox },
  { key: 'network', label: 'Network', Icon: Users },
  { key: 'journal', label: 'Journal', Icon: NotebookPen },
  { key: 'search', label: 'Search', Icon: Search },
];

export function TopHeader({
  eyebrow = 'Today',
  title = 'Today',
  greeting = '',
  initial = 'J',
  cleared = 0,
  total = 10,
}) {
  const pct = total > 0 ? Math.round((cleared / total) * 100) : 0;

  return (
    <header className="sticky top-0 z-20 bg-[#FAF8F3]/95 backdrop-blur-sm px-[22px] pt-[18px] pb-[14px]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold tracking-[1.6px] text-[#9A958A] uppercase">
            {eyebrow}
          </div>
          <div className="font-['Newsreader'] text-[34px] leading-[1.05] text-[#1F1D18] mt-[3px]">
            {title}
          </div>
          {greeting && (
            <div className="font-['Newsreader'] text-[15px] italic text-[#9A958A] mt-[2px]">
              {greeting}
            </div>
          )}
        </div>
        <div className="w-[38px] h-[38px] rounded-full border border-[#DDD6C8] bg-white flex items-center justify-center font-['Newsreader'] text-[17px] text-[#6F6A60]">
          {initial}
        </div>
      </div>

      {/* Load progress */}
      <div className="mt-4 flex items-center gap-[11px]">
        <div className="flex-1 h-[5px] rounded-full bg-[#ECE6DA] overflow-hidden">
          <div
            className="h-full bg-[#5F7F67] rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[12px] text-[#6F6A60] whitespace-nowrap">
          {cleared} of {total} cleared
        </div>
      </div>
    </header>
  );
}

export function BottomNav({ active = 'queue', onNavigate = () => {} }) {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-[#EAE3D6] bg-[#FAF8F3]/95 backdrop-blur-sm px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]">
      <ul className="flex items-stretch justify-around">
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const isActive = key === active;
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                onClick={() => onNavigate(key)}
                className={`flex w-full flex-col items-center gap-1 rounded-xl py-1.5 transition-colors ${
                  isActive ? 'text-[#26241F]' : 'text-[#A8A294] hover:text-[#6F6A60]'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={isActive ? 2 : 1.6}
                />
                <span className="text-[10px] font-semibold tracking-[0.4px]">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Convenience wrapper if a parent wants both pieces from one import.
export default function Navigation(props) {
  return (
    <>
      <TopHeader {...props} />
      <BottomNav {...props} />
    </>
  );
}
