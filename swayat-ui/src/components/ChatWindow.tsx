import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
}

interface ChatWindowProps {
  taskTitle: string;
  messages: Message[];
  isRunning: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ taskTitle, messages, isRunning }) => {
  const containerRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    shouldAutoScrollRef.current = distanceFromBottom < 64;
  };

  return (
    <main
      ref={containerRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto bg-[var(--app-bg)] px-8 py-8"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col">
        <div className="mb-8 rounded-[28px] border border-[var(--app-border)] bg-[var(--app-panel)] px-6 py-5 shadow-[0_24px_60px_rgba(2,6,23,0.28)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--app-text-secondary)]">
            Current task
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--app-text)]">
            {taskTitle}
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--app-text-secondary)]">
            Ask AKYA to plan the next action, execute it, and keep the inspector updated with decisions and code.
          </p>
        </div>

        {messages.length === 0 ? (
          <div className="flex min-h-[320px] flex-col justify-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] px-8 py-10">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--app-text-secondary)]">
              Ready
            </p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--app-text)]">
              Start a calm, focused automation flow.
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--app-text-secondary)]">
              Type a task in the composer below. AKYA will respond in chat, expose its next actions in the inspector, and keep generated code visible in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {['open youtube on chrome', 'download file', 'send email'].map((example) => (
                <div
                  key={example}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-[var(--app-text-secondary)]"
                >
                  {example}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} content={message.content} isUser={message.isUser} />
              ))}
            </div>
            {isRunning ? (
              <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-[var(--app-text-secondary)] shadow-[0_12px_24px_rgba(2,6,23,0.14)]">
                ...AKYA is thinking...
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </main>
  );
};

export default ChatWindow;
