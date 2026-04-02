import React from 'react';

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ content, isUser }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[min(88%,48rem)] rounded-[26px] border px-5 py-4 shadow-[0_16px_34px_rgba(2,6,23,0.16)] ${
          isUser
            ? 'border-indigo-400/20 bg-indigo-500/10'
            : 'border-[var(--app-border)] bg-[var(--app-panel)]'
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] ${
              isUser
                ? 'bg-indigo-400/10 text-indigo-200'
                : 'bg-white/[0.04] text-[var(--app-text-secondary)]'
            }`}
          >
            {isUser ? 'You' : 'AKYA'}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--app-text)]">{content}</p>
      </div>
    </div>
  );
};

export default MessageBubble;
