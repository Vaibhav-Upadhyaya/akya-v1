import React, { useEffect, useRef, useState } from 'react';

interface TopBarProps {
  taskTitle: string;
  messageCount: number;
  isRunning: boolean;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
  onShare: () => void;
  onOpenShareFolder: () => void;
  isSharing: boolean;
  isOpeningShareFolder: boolean;
}

const TopBar: React.FC<TopBarProps> = ({
  taskTitle,
  messageCount,
  isRunning,
  onToggleSidebar,
  isSidebarOpen,
  onTogglePanel,
  isPanelOpen,
  onShare,
  onOpenShareFolder,
  isSharing,
  isOpeningShareFolder
}) => {
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!shareMenuRef.current?.contains(event.target as Node)) {
        setIsShareMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (isSharing || isOpeningShareFolder) {
      setIsShareMenuOpen(false);
    }
  }, [isOpeningShareFolder, isSharing]);

  const handleShareClick = () => {
    if (isSharing || isOpeningShareFolder) {
      return;
    }

    setIsShareMenuOpen(false);
    onShare();
  };

  const shareLabel = isOpeningShareFolder
    ? 'Opening Shares'
    : isSharing
      ? 'Sharing...'
      : 'Share';

  return (
    <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-bg)] px-8">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--app-text-secondary)]">
            Workspace
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] ${
              isRunning
                ? 'border-indigo-400/20 bg-indigo-500/10 text-indigo-200'
                : 'border-white/8 bg-white/[0.03] text-[var(--app-text-secondary)]'
            }`}
          >
            {isRunning ? 'Running' : 'Idle'}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-[24px] font-semibold tracking-[-0.03em] text-[var(--app-text)]">
            {taskTitle}
          </h1>
          <p className="hidden text-sm text-[var(--app-text-secondary)] md:block">
            {messageCount} {messageCount === 1 ? 'message' : 'messages'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div ref={shareMenuRef} className="relative flex items-center">
          <button
            type="button"
            onClick={handleShareClick}
            disabled={isSharing || isOpeningShareFolder}
            className="rounded-l-2xl border border-r-0 border-[var(--app-border)] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[var(--app-text-secondary)] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-50"
            title="Save the current conversation to akyaShares."
          >
            {shareLabel}
          </button>
          <button
            type="button"
            onClick={() => setIsShareMenuOpen((prev) => !prev)}
            disabled={isSharing || isOpeningShareFolder}
            className="rounded-r-2xl border border-[var(--app-border)] bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-[var(--app-text-secondary)] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-50"
            title="Share options"
            aria-haspopup="menu"
            aria-expanded={isShareMenuOpen}
          >
            v
          </button>
          {isShareMenuOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[140px] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[#0b1220] shadow-[0_16px_36px_rgba(2,6,23,0.28)]">
              <button
                type="button"
                onClick={() => {
                  setIsShareMenuOpen(false);
                  onOpenShareFolder();
                }}
                className="block w-full px-4 py-3 text-left text-sm font-medium text-[var(--app-text-secondary)] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[var(--app-text)]"
              >
                Open
              </button>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-2xl border border-[var(--app-border)] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[var(--app-text-secondary)] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[var(--app-text)]"
        >
          {isSidebarOpen ? 'Hide' : 'Show'} Tasks
        </button>
        <button
          type="button"
          onClick={onTogglePanel}
          className="rounded-2xl border border-[var(--app-border)] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[var(--app-text-secondary)] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[var(--app-text)]"
        >
          {isPanelOpen ? 'Hide' : 'Show'} Inspector
        </button>
      </div>
    </header>
  );
};

export default TopBar;
