import { MessageSquare, Search, Settings, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'chats', label: 'Chat', icon: MessageSquare, path: '/app/chats' },
  { id: 'contacts', label: 'Contact', icon: Users, path: '/app/contacts' },
  { id: 'settings', label: 'Setting', icon: Settings, path: '/app/settings' },
] as const;

function isTabActive(pathname: string, tabId: string, path: string) {
  if (pathname === path) return true;
  if (tabId === 'chats' && (pathname === '/app' || pathname === '/app/chats')) return true;
  return false;
}

export function GlassBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSearchActive = location.pathname.startsWith('/app/search');

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-end justify-between gap-3 px-4 pb-safe md:hidden"
      aria-label="Main navigation"
    >
      <div className="glass-ios pointer-events-auto flex flex-1 items-center justify-around rounded-full px-1 py-1.5">
        {TABS.map(({ id, label, icon: Icon, path }) => {
          const active = isTabActive(location.pathname, id, path);
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigate(path)}
              className={cn(
                'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-2 transition-all duration-200',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <span
                  className="absolute inset-0 rounded-full bg-foreground/8 dark:bg-foreground/12"
                  aria-hidden
                />
              )}
              <Icon size={22} strokeWidth={active ? 2.25 : 1.75} className="relative z-[1]" />
              <span className="relative z-[1] text-[10px] font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => navigate('/app/search')}
        className={cn(
          'glass-ios pointer-events-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-all duration-200',
          isSearchActive
            ? 'text-primary ring-2 ring-primary/30'
            : 'text-foreground hover:scale-[1.02] active:scale-95'
        )}
        aria-label="Search"
        aria-current={isSearchActive ? 'page' : undefined}
      >
        <Search size={22} strokeWidth={isSearchActive ? 2.25 : 1.75} />
      </button>
    </nav>
  );
}
