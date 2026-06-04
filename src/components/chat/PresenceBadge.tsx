import { cn } from '@/lib/utils';
import { isUserOnline, type PresenceRecord } from '@/src/lib/presence';

export function PresenceBadge({
  presence,
  className,
}: {
  presence?: PresenceRecord;
  className?: string;
}) {
  const online = isUserOnline(presence);

  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
        online ? 'bg-primary ring-1 ring-primary/30' : 'bg-muted-foreground/50',
        className
      )}
      aria-label={online ? 'Online' : 'Offline'}
    />
  );
}
