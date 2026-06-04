import { format } from 'date-fns';
import { MoreVertical, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PresenceBadge } from '@/src/components/chat/PresenceBadge';
import { isUserOnline, type PresenceRecord } from '@/src/lib/presence';
import type { ContactPreview } from '@/src/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ContactRowProps {
  contact: ContactPreview;
  currentUserId: string;
  isActive: boolean;
  presence?: PresenceRecord;
  onClick: () => void;
  onDelete?: () => void;
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
  onDelete,
}: ContactRowProps) {
  const last = contact.lastMessage;
  const online = contact.isOnline ?? isUserOnline(presence);

  const previewText = last
    ? last.text
    : contact.about || 'No messages yet';

  const timeLabel = last?.createdAt
    ? formatMessageTime(last.createdAt)
    : null;

  const statusText =
    contact.statusText ?? (online ? 'Online' : 'Offline');

  return (
    <div
      className={`group w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 ${
        isActive ? 'bg-muted' : ''
      } cursor-pointer`}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={contact.img_link} />
          <AvatarFallback>
            {contact.username?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        <PresenceBadge presence={presence} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate text-foreground">
              {contact.username || 'Unknown'}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {timeLabel && (
              <span className="text-[10px] text-muted-foreground">
                {timeLabel}
              </span>
            )}
          </div>
        </div>

        {/* Last Message */}
        <div className="flex items-center justify-between gap-2 mt-1">
  <p className="text-xs text-muted-foreground truncate flex-1">
    {previewText}
  </p>

  {onDelete && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-foreground rounded transition-opacity shrink-0"
        >
          <MoreVertical size={14} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem
          className="text-destructive flex items-center gap-1.5 cursor-pointer"
          onClick={onDelete}
        >
          <Trash2 size={14} />
          Delete chat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )}
</div>
      </div>
    </div>
  );
}