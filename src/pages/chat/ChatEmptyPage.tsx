import { MessageSquare } from 'lucide-react';

export function ChatEmptyPage() {
  return (
    <main className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-muted/10 p-6 text-muted-foreground">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
        <MessageSquare size={44} className="opacity-30" />
      </div>
      <h2 className="mb-2 text-2xl font-light">Xync Web</h2>
      <p className="max-w-xs text-center text-sm leading-relaxed">
        Select a conversation or search for a contact by Xync ID to start chatting.
      </p>
    </main>
  );
}
