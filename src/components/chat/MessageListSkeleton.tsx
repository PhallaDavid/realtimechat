import { Skeleton } from '@/components/ui/skeleton';

export function MessageListSkeleton() {
  return (
    <div className="space-y-4 p-4 md:px-8">
      {[false, true, false, true, false].map((isMe, i) => (
        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
          <Skeleton
            className={`h-12 rounded-2xl ${isMe ? 'w-[55%] rounded-br-sm' : 'w-[45%] rounded-bl-sm'}`}
          />
        </div>
      ))}
    </div>
  );
}
