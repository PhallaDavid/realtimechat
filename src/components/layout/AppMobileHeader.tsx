import { LogOut, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLogo } from '@/src/components/brand/AppLogo';
import { useAuth } from '@/src/contexts/auth-context';
import { USER_ID_LABEL } from '@/src/lib/brand';
import { useTheme } from '@/hooks/use-theme';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppMobileHeaderProps {
  title?: string;
  onProfileClick?: () => void;
}

export function AppMobileHeader({ title, onProfileClick }: AppMobileHeaderProps) {
  const { currentUser, signOutUser } = useAuth();
  const { setTheme, isDark } = useTheme();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const isTabHeader = Boolean(title);

  return (
    <header className="glass-ios-subtle sticky top-0 z-20 shrink-0 border-b border-border/40 md:hidden">
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-3 pb-2.5 pt-safe sm:px-4',
          'min-h-[calc(3.5rem+max(0.75rem,env(safe-area-inset-top,0px)))]'
        )}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left active:opacity-80"
          onClick={onProfileClick ?? (() => navigate('/app/settings'))}
        >
          {isTabHeader ? (
            <AppLogo size={40} className="shrink-0" />
          ) : (
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={currentUser.img_link} />
              <AvatarFallback>{currentUser.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight sm:text-base">
              {title ?? currentUser.username}
            </p>
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
              <span className="sr-only">{USER_ID_LABEL}: </span>
              <span className="sm:hidden">{currentUser.username}</span>
              <span className="hidden sm:inline">
                {USER_ID_LABEL}: {currentUser.XyncId}
              </span>
            </p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => signOutUser().then(() => navigate('/auth'))}
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
}
