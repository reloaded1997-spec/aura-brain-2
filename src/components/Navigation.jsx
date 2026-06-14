// =============================================================================
// components/Navigation.jsx — Global header + bottom PWA nav
// =============================================================================

import { Inbox, Users, NotebookPen, Search, CalendarCheck, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'queue',   label: 'Queue',   Icon: Inbox },
  { key: 'circle',  label: 'Circle',  labelLong: 'Relationship Circles', Icon: Users },
  { key: 'rhythms', label: 'Rhythms', labelLong: 'Rhythms & Tasks',      Icon: CalendarCheck },
  { key: 'journal', label: 'Journal', Icon: NotebookPen },
  { key: 'search',  label: 'Search',  Icon: Search },
];

export const NAV_PATHS = {
  queue:   '/',
  circle:  '/circle',
  rhythms: '/rhythms',
  journal: '/journal',
  search:  '/search',
};

export function TopHeader({
  eyebrow = 'Today',
  title = 'Today',
  greeting = '',
  initial = 'J',
  cleared = 0,
  total = 10,
  onSettings = null,
}) {
  const pct = total > 0 ? Math.round((cleared / total) * 100) : 0;

  return (
    <header className="sticky top-0 z-20 bg-[#FAF8F3]/95 dark:bg-[#171511]/95 backdrop-blur-sm px-[22px] pt-[18px] pb-[14px]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold tracking-[1.6px] text-[#9A958A] dark:text-[#827C70] uppercase">
            {eyebrow}
          </div>
          <div className="font-['Newsreader'] text-[34px] leading-[1.05] text-[#1F1D18] dark:text-[#F1EDE5] mt-[3px]">
            {title}
          </div>
          {greeting && (
            <div className="font-['Newsreader'] text-[15px] italic text-[#9A958A] dark:text-[#827C70] mt-[2px]">
              {greeting}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onSettings && (
            <button
              type="button"
              onClick={onSettings}
              aria-label="Settings"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-[#9A958A] dark:text-[#827C70] transition-colors hover:bg-[#EFEAE0] dark:hover:bg-[#24221C] hover:text-[#6F6A60] dark:hover:text-[#A39C8E]"
            >
              <Settings className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </button>
          )}
          <div className="w-[38px] h-[38px] rounded-full border border-[#DDD6C8] dark:border-[#3A352C] bg-white dark:bg-[#221F1B] flex items-center justify-center font-['Newsreader'] text-[17px] text-[#6F6A60] dark:text-[#A39C8E]">
            {initial}
          </div>
        </div>
      </div>

      {/* Load progress */}
      <div className="mt-4 flex items-center gap-[11px]">
        <div className="flex-1 h-[5px] rounded-full bg-[#ECE6DA] dark:bg-[#2A261E] overflow-hidden">
          <div
            className="h-full bg-[#5F7F67] dark:bg-[#80A789] rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[12px] text-[#6F6A60] dark:text-[#A39C8E] whitespace-nowrap">
          {cleared} of {total} cleared
        </div>
      </div>
    </header>
  );
}

export function BottomNav({ active = 'queue', onNavigate = () => {} }) {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-[#EAE3D6] dark:border-[#2A2620] bg-[#FAF8F3]/95 dark:bg-[#171511]/95 backdrop-blur-sm px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]">
      <ul className="flex items-stretch justify-around">
        {NAV_ITEMS.map(({ key, label, labelLong, Icon }) => {
          const isActive = key === active;
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                onClick={() => onNavigate(key)}
                className={`flex w-full flex-col items-center gap-1 rounded-xl py-1.5 transition-colors ${
                  isActive
                    ? 'text-[#26241F] dark:text-[#ECE7DD]'
                    : 'text-[#A8A294] dark:text-[#6E685D] hover:text-[#6F6A60] dark:hover:text-[#A39C8E]'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={isActive ? 2 : 1.6}
                />
                {labelLong ? (
                  <>
                    <span className="text-[10px] font-semibold tracking-[0.4px] md:hidden">
                      {label}
                    </span>
                    <span className="hidden text-[10px] font-semibold tracking-[0.4px] md:block">
                      {labelLong}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-semibold tracking-[0.4px]">{label}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function Navigation(props) {
  return (
    <>
      <TopHeader {...props} />
      <BottomNav {...props} />
    </>
  );
}
