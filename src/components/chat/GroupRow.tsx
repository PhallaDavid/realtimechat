import { format } from 'date-fns';
import { Users, MoreVertical, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { GroupChat } from '@/src/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GroupRowProps {
  group: GroupChat;
  isActive: boolean;
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

export function GroupRow({ group, isActive, onClick, onDelete }: GroupRowProps) {
  const last = group.lastMessage;

  const previewText = last
    ? last.senderId === 'system'
      ? last.text
      : `${last.senderName}: ${last.text}`
    : group.description || 'No messages yet';

  const timeLabel = last?.createdAt ? formatMessageTime(last.createdAt) : null;

  return (
    <div
      className={`group w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 ${
        isActive ? 'bg-muted' : ''
      } cursor-pointer`}
      onClick={onClick}
    >
      {/* Group Avatar */}
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={group.img_link} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {group.name?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-background rounded-full border flex items-center justify-center text-muted-foreground shadow-sm">
          <Users className="h-2.5 w-2.5" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate text-foreground">
              {group.name || 'Unnamed Group'}
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
          <LogOut size={14} />
          Leave group
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )}
</div>
      </div>
    </div>
  );
}
