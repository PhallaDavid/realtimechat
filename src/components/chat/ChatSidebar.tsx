import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  LogOut,
  Moon,
  Settings,
  Sun,
  MessageCircle,
  Users,
  Search,
  Plus,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/src/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import type { UserProfile } from '@/src/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ConversationList } from '@/src/components/chat/ConversationList';
import { CreateGroupDialog } from '@/src/components/chat/CreateGroupDialog';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  onOpenSettings: () => void;
  ephemeralFriend?: UserProfile | null;
}

export function ChatSidebar({ onOpenSettings, ephemeralFriend }: ChatSidebarProps) {
  const { currentUser, signOutUser } = useAuth();
  const { friendId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { setTheme, isDark } = useTheme();
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const tabVariant =
    location.pathname.startsWith('/app/contacts') ? 'contacts' : 'chats';

  if (!currentUser) return null;

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 w-full shrink-0 flex-col border-r bg-background md:w-[340px] md:min-w-[300px] md:max-w-[400px]',
        friendId ? 'hidden md:flex' : 'hidden md:flex'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b bg-muted/30 px-4">
        <button
          type="button"
          className="flex items-center gap-2 text-left"
          onClick={onOpenSettings}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={currentUser.img_link} />
            <AvatarFallback>{currentUser.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold">{currentUser.username}</span>
        </button>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Theme</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateGroup(true)}>
                <Plus size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New Group</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onOpenSettings}>
                <Settings size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOutUser().then(() => navigate('/auth'))}
              >
                <LogOut size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign Out</TooltipContent>
          </Tooltip>
        </div>
      </div>

     <nav className="flex border-b px-2 py-1.5 gap-1">
  <Button
    variant={tabVariant === 'chats' ? 'secondary' : 'ghost'}
    size="sm"
    className="flex-1"
    onClick={() => navigate('/app/chats')}
  >
    <MessageCircle className="mr-2 h-4 w-4" />
    Chats
  </Button>

  <Button
    variant={tabVariant === 'contacts' ? 'secondary' : 'ghost'}
    size="sm"
    className="flex-1"
    onClick={() => navigate('/app/contacts')}
  >
    <Users className="mr-2 h-4 w-4" />
    Contacts
  </Button>

  {/* <Button
    variant={location.pathname.startsWith('/app/search') ? 'secondary' : 'ghost'}
    size="sm"
    className="flex-1"
    onClick={() => navigate('/app/search')}
  >
    <Search className="mr-2 h-4 w-4" />
    Search
  </Button> */}
</nav>

      <ConversationList variant={tabVariant} ephemeralFriend={ephemeralFriend} />
      <CreateGroupDialog open={showCreateGroup} onOpenChange={setShowCreateGroup} />
    </aside>
  );
}
