import { Moon, Monitor, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Theme } from '@/hooks/use-theme';

export function AuthThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const cycleTheme = () => {
    const order: Theme[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const icon =
    theme === 'dark' ? <Moon size={18} /> : theme === 'light' ? <Sun size={18} /> : <Monitor size={18} />;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="absolute top-4 right-4"
      onClick={cycleTheme}
      aria-label="Toggle theme"
    >
      {icon}
    </Button>
  );
}
