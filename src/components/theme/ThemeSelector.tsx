import type React from 'react';
import { Moon, Monitor, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Theme } from '@/hooks/use-theme';

export function ThemeSelector({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { value: 'system', label: 'System', icon: <Monitor size={16} /> },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          variant={theme === opt.value ? 'default' : 'outline'}
          className="flex h-auto flex-col gap-1.5 py-3"
          onClick={() => setTheme(opt.value)}
        >
          {opt.icon}
          <span className="text-xs">{opt.label}</span>
        </Button>
      ))}
    </div>
  );
}
