import React from 'react';

interface Task {
  id: string;
  title: string;
}

interface SidebarProps {
  tasks: Task[];
  onNewTask: () => void;
  onSelectTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  selectedTaskId: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({
  tasks,
  onNewTask,
  onSelectTask,
  onDeleteTask,
  selectedTaskId
}) => {
  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="border-b border-[var(--app-border)] px-5 py-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold tracking-[0.28em] text-white">
            A
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-[-0.02em] text-[var(--app-text)]">AKYA</p>
            <p className="text-xs text-[var(--app-text-secondary)]">AI automation workspace</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNewTask}
          className="w-full rounded-2xl border border-[var(--app-border)] bg-white/[0.04] px-4 py-3 text-sm font-medium text-[var(--app-text)] transition-colors duration-150 hover:bg-white/[0.08]"
        >
          + New Task
        </button>
      </div>
      <div className="px-5 pb-3 pt-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--app-text-secondary)]">
          Tasks
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {tasks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-[var(--app-text-secondary)]">
            Start a task to build your first automation run.
          </div>
        ) : (
          tasks.map((task) => {
            const isActive = selectedTaskId === task.id;

            return (
              <div
                key={task.id}
                className={`group relative mb-1.5 w-full overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all duration-150 ${
                  isActive
                    ? 'border-[var(--app-border)] bg-[#1f2937] shadow-[0_14px_32px_rgba(2,6,23,0.16)]'
                    : 'border-transparent bg-transparent hover:border-white/8 hover:bg-white/[0.04]'
                }`}
              >
                <span
                  className={`absolute bottom-3 left-0 top-3 w-0.5 rounded-full transition-colors ${
                    isActive ? 'bg-[var(--app-accent)]' : 'bg-transparent group-hover:bg-white/12'
                  }`}
                />
                <div className="flex items-center gap-3 pl-3">
                  <button
                    type="button"
                    onClick={() => onSelectTask(task.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium text-[var(--app-text)]">{task.title}</p>
                    <p className="mt-1 text-xs text-[var(--app-text-secondary)]">
                      {isActive ? 'Active task' : 'Ready'}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'border-white/10 bg-white/[0.06] text-[var(--app-text-secondary)] hover:text-red-200'
                        : 'border-transparent bg-transparent text-[var(--app-text-secondary)] opacity-0 hover:text-red-200 group-hover:opacity-100 focus:opacity-100'
                    }`}
                    aria-label={`Delete ${task.title}`}
                    title="Delete task"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
