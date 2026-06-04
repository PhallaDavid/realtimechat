import { ConversationList } from '@/src/components/chat/ConversationList';
import { AppMobileHeader } from '@/src/components/layout/AppMobileHeader';
import { ChatEmptyPage } from '@/src/pages/chat/ChatEmptyPage';

export function ChatsPage() {
  return (
    <>
      <div className="flex h-full min-h-0 flex-col md:hidden">
        <AppMobileHeader title="Chats" />
        <ConversationList variant="chats" />
      </div>
      <div className="hidden h-full min-h-0 flex-1 md:flex">
        <ChatEmptyPage />
      </div>
    </>
  );
}
