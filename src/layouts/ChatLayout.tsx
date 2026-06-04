import { useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ChatSidebar } from '@/src/components/chat/ChatSidebar';
import { GlassBottomNav } from '@/src/components/navigation/GlassBottomNav';
import { SettingsSheet } from '@/src/components/settings/SettingsSheet';
import { useAuth } from '@/src/contexts/auth-context';
import { useFriend } from '@/src/hooks/use-friend';
import { usePresenceManager } from '@/src/hooks/use-presence-manager';

export type ChatOutletContext = { onViewImage: (url: string) => void };

function isTabRoute(pathname: string) {
  return (
    pathname === '/app' ||
    pathname === '/app/chats' ||
    pathname === '/app/contacts' ||
    pathname === '/app/search' ||
    pathname === '/app/settings'
  );
}

export function ChatLayout() {
  const { friendId, groupId } = useParams();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { friend } = useFriend(friendId);
  usePresenceManager(currentUser?.id);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isEphemeral =
    friendId && friend && !currentUser?.contacts?.includes(friendId);

  const onTab = isTabRoute(location.pathname);
  const showBottomNav = !friendId && !groupId && onTab;
  const showMobileMain = friendId || groupId || onTab;

  return (
    <TooltipProvider>
      <div className="flex h-app w-full overflow-hidden bg-background font-sans">
        <ChatSidebar
          onOpenSettings={() => setShowSettings(true)}
          ephemeralFriend={isEphemeral ? friend : null}
        />
        <div
          className={cn(
            'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
            showMobileMain ? 'flex' : 'hidden md:flex',
            (friendId || groupId) && 'flex'
          )}
        >
          <div
            className={cn(
              'min-h-0 flex-1 overflow-hidden',
              showBottomNav && 'pb-[5.5rem]'
            )}
          >
            <Outlet context={{ onViewImage: setSelectedImage } satisfies ChatOutletContext} />
          </div>
          {showBottomNav && <GlassBottomNav />}
        </div>
        <SettingsSheet
          open={showSettings}
          onOpenChange={setShowSettings}
          onViewImage={setSelectedImage}
        />
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-lg border-none bg-black p-2">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Profile"
                className="h-auto w-full rounded-lg object-contain"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
