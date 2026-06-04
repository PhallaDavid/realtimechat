import { Download, FileIcon, Mic } from 'lucide-react';
import { getMessageType } from '@/src/lib/messages';
import type { Message } from '@/src/types';

interface MessageContentProps {
  msg: Message;
  isMe: boolean;
  onViewImage?: (url: string) => void;
}

function mediaSrc(msg: Message): string | undefined {
  return msg.mediaUrl;
}

export function MessageContent({ msg, isMe, onViewImage }: MessageContentProps) {
  const type = getMessageType(msg);
  const src = mediaSrc(msg);

  if (type === 'image' && src) {
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          className="block max-w-full overflow-hidden rounded-xl"
          onClick={() => onViewImage?.(src)}
        >
          <img
            src={src}
            alt={msg.fileName || 'Image'}
            className="max-h-64 max-w-full rounded-xl object-cover"
            loading="lazy"
          />
        </button>
        {msg.text?.trim() ? <span className="break-words">{msg.text}</span> : null}
      </div>
    );
  }

  if (type === 'voice' && msg.mediaUrl) {
    return (
      <div className="flex min-w-[200px] items-center gap-2">
        <Mic size={16} className="shrink-0 opacity-70" />
        <audio
          controls
          src={src}
          className="h-8 max-w-[220px] flex-1"
          preload="metadata"
        />
        {msg.duration ? (
          <span className="text-[10px] opacity-70">{msg.duration}s</span>
        ) : null}
      </div>
    );
  }

  if (type === 'file' && src) {
    return (
      <a
        href={src}
        download={msg.fileName}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
          isMe ? 'border-primary-foreground/20' : 'border-border'
        }`}
      >
        <FileIcon size={18} className="shrink-0" />
        <span className="truncate text-sm font-medium">{msg.fileName || 'Download file'}</span>
        <Download size={14} className="shrink-0 opacity-70" />
      </a>
    );
  }

  return <span className="break-words">{msg.text}</span>;
}
