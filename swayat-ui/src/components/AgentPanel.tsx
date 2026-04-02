import React, { useEffect, useState } from 'react';

interface AgentPanelProps {
  isOpen: boolean;
  taskTitle: string;
  isRunning: boolean;
  runStartedAt: number | null;
  decisions: string[];
  code: string;
  onClearMemory: () => void;
  isClearingMemory: boolean;
}

type AgentTab = 'decisions' | 'logs' | 'code';

const formatRuntime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
};

const AgentPanel: React.FC<AgentPanelProps> = ({
  isOpen,
  taskTitle,
  isRunning,
  runStartedAt,
  decisions,
  code,
  onClearMemory,
  isClearingMemory
}) => {
  const [activeTab, setActiveTab] = useState<AgentTab>('decisions');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!runStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsedSeconds = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - runStartedAt) / 1000)));
    };

    updateElapsedSeconds();

    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(updateElapsedSeconds, 1000);
    return () => window.clearInterval(intervalId);
  }, [isRunning, runStartedAt]);

  if (!isOpen) return null;

  const nextActions = decisions.slice(0, 3);
  const statusLabel = isRunning ? 'Running' : decisions.length > 0 ? 'Completed' : 'Idle';
  const confidenceLabel = decisions.length > 0 ? (isRunning ? 'High' : 'Stable') : 'Pending';

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="border-b border-[var(--app-border)] px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--app-text)]">
              Inspector
            </h2>
            <p className="mt-1 text-sm text-[var(--app-text-secondary)]">
              Decisions, execution logs, and generated code.
            </p>
          </div>
          <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--app-text-secondary)]">
            AKYA
          </span>
        </div>
        <div className="mt-5 flex rounded-2xl border border-[var(--app-border)] bg-[#0b1220] p-1">
          {(['decisions', 'logs', 'code'] as AgentTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium capitalize transition-colors duration-150 ${
                activeTab === tab
                  ? 'bg-white/[0.06] text-[var(--app-text)]'
                  : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {activeTab === 'decisions' ? (
          <div className="space-y-5">
            <div className="rounded-[24px] border border-[var(--app-border)] bg-[#0b1220] p-5 shadow-[0_16px_36px_rgba(2,6,23,0.18)]">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--app-text-secondary)]">
                Task
              </p>
              <p className="mt-3 text-base font-medium leading-7 text-[var(--app-text)]">{taskTitle}</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-[24px] border border-[var(--app-border)] bg-[#0b1220] p-4">
                <p className="text-xs text-[var(--app-text-secondary)]">Status</p>
                <p className="mt-2 text-sm font-medium text-[var(--app-text)]">{statusLabel}</p>
              </div>
              <div className="rounded-[24px] border border-[var(--app-border)] bg-[#0b1220] p-4">
                <p className="text-xs text-[var(--app-text-secondary)]">Runtime</p>
                <p className="mt-2 text-sm font-medium text-[var(--app-text)]">
                  {runStartedAt ? formatRuntime(elapsedSeconds) : '--'}
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--app-border)] bg-[#0b1220] p-4">
                <p className="text-xs text-[var(--app-text-secondary)]">Confidence</p>
                <p className="mt-2 text-sm font-medium text-[var(--app-text)]">{confidenceLabel}</p>
              </div>
            </div>
            <div className="rounded-[24px] border border-[var(--app-border)] bg-[#0b1220] p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--app-text-secondary)]">
                Next Actions
              </p>
              {nextActions.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--app-text-secondary)]">
                  Actions will appear here after AKYA starts reasoning.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {nextActions.map((decision, idx) => (
                    <div
                      key={`${decision}-${idx}`}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[var(--app-text)]"
                    >
                      {decision}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'logs' ? (
          <div className="rounded-[24px] border border-[var(--app-border)] bg-[#0b1220] p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--app-text-secondary)]">
              Logs
            </p>
            {decisions.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--app-text-secondary)]">No logs yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {decisions.map((decision, idx) => (
                  <div
                    key={`${decision}-${idx}`}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--app-text-secondary)]">
                      Log {idx + 1}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--app-text)]">{decision}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {activeTab === 'code' ? (
          <div className="rounded-[24px] border border-[var(--app-border)] bg-[#0b1220] p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--app-text-secondary)]">
              Python
            </p>
            <div className="mt-4 overflow-hidden rounded-[20px] border border-white/8 bg-[#020617]">
              <pre className="max-h-[520px] overflow-auto px-4 py-4 font-mono text-[12px] leading-6 text-slate-200">
                {code || '// No code generated yet'}
              </pre>
            </div>
          </div>
        ) : null}
      </div>
      <div className="shrink-0 border-t border-[var(--app-border)] px-6 py-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClearMemory}
            disabled={isRunning || isClearingMemory}
            className="rounded-2xl border border-[var(--app-border)] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[var(--app-text-secondary)] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-50"
            title="Clear Akya memory"
          >
            {isClearingMemory ? 'Clearing...' : 'Clear'}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AgentPanel;
