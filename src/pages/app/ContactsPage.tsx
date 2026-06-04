import { ConversationList } from '@/src/components/chat/ConversationList';
import { AppMobileHeader } from '@/src/components/layout/AppMobileHeader';
import { ChatEmptyPage } from '@/src/pages/chat/ChatEmptyPage';

export function ContactsPage() {
  return (
    <>
      <div className="flex h-full min-h-0 flex-col md:hidden">
        <AppMobileHeader title="Contacts" />
        <ConversationList variant="contacts" />
      </div>
      <div className="hidden h-full min-h-0 flex-1 md:flex">
        <ChatEmptyPage />
      </div>
    </>
  );
}
