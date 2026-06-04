import { LogOut, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface AppMobileHeaderProps {
  title?: string;
  onProfileClick?: () => void;
}

export function AppMobileHeader({ title, onProfileClick }: AppMobileHeaderProps) {
  const { currentUser, signOutUser } = useAuth();
  const { setTheme, isDark } = useTheme();
  const navigate = useNavigate();

  if (!currentUser) return null;

  return (
    <header className="glass-ios-subtle flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-4 pt-safe sm:h-16">
      <button
        type="button"
        className="flex min-w-0 items-center gap-2 text-left"
        onClick={onProfileClick ?? (() => navigate('/app/settings'))}
      >
        <Avatar className="h-9 w-9">
          <AvatarImage src={currentUser.img_link} />
          <AvatarFallback>{currentUser.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title ?? currentUser.username}</p>
          <p className="truncate text-[10px] text-muted-foreground">Xync ID: {currentUser.xyncId}</p>
        </div>
      </button>
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOutUser().then(() => navigate('/auth'))}
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  );
}
