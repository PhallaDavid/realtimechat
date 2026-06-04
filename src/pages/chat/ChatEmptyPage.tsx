import { AppLogo } from '@/src/components/brand/AppLogo';
import { APP_NAME, USER_ID_LABEL } from '@/src/lib/brand';

export function ChatEmptyPage() {
  return (
    <main className="flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-muted/10 p-6 text-muted-foreground">
      <div className="mb-6 opacity-40">
        <AppLogo size={96} />
      </div>
      <h2 className="mb-2 text-2xl font-light">{APP_NAME}</h2>
      <p className="max-w-xs text-center text-sm leading-relaxed">
        Select a conversation to start chatting.
      </p>
    </main>
  );
}
