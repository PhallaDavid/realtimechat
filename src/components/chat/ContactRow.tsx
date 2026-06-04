import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PresenceBadge } from '@/src/components/chat/PresenceBadge';
import { isUserOnline, type PresenceRecord } from '@/src/lib/presence';
import type { ContactPreview } from '@/src/types';

interface ContactRowProps {
  contact: ContactPreview;
  currentUserId: string;
  isActive: boolean;
  presence?: PresenceRecord;
  onClick: () => void;
}

function formatMessageTime(date: Date | null): string {
  if (!date) return '';
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return format(date, 'h:mm a');
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date > weekAgo) return format(date, 'EEE');
  return format(date, 'MMM d');
}

export function ContactRow({
  contact,
  currentUserId,
  isActive,
  presence,
  onClick,
}: ContactRowProps) {
  const last = contact.lastMessage;
  const online = contact.isOnline ?? isUserOnline(presence);
  const previewText = last
    ? last.text
    : contact.about || 'No messages yet';
  const timeLabel = last?.createdAt ? formatMessageTime(last.createdAt) : null;
  const statusText = contact.statusText ?? (online ? 'Online' : 'Offline');

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center px-3 py-3 gap-3 hover:bg-muted/50 transition-colors text-left ${
        isActive ? 'bg-muted' : ''
      }`}
    >
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={contact.img_link} />
          <AvatarFallback>{contact.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <PresenceBadge presence={presence} />
      </div>
      <div className="flex-1 min-w-0 border-b border-border/50 pb-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-medium text-sm truncate">{contact.username || 'Unknown'}</p>
          {timeLabel && (
            <span className="text-[10px] text-muted-foreground shrink-0">{timeLabel}</span>
          )}
        </div>
        {/* <p
          className={`text-[11px] truncate ${
            online ? 'text-primary font-medium' : 'text-muted-foreground'
          }`}
        >
          {statusText}
        </p> */}
        <p className="text-xs text-muted-foreground truncate mt-0.5">{previewText}</p>
      </div>
    </button>
  );
}
