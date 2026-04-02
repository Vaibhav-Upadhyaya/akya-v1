import { useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ChatWindow from './components/ChatWindow';
import InputBox from './components/InputBox';
import AgentPanel from './components/AgentPanel';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
}

type InputMode = 'type' | 'mic';

interface Task {
  id: string;
  title: string;
  messages: Message[];
}

interface AutomationResponse {
  jobId?: string;
  status?: string;
  message?: string;
  decisions?: string[];
  generatedCode?: string;
  rawOutput?: string;
  timedOut?: boolean;
}

interface ShareResponse {
  message?: string;
  fileName?: string;
  filePath?: string;
  shareDirectoryPath?: string;
}

const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787');
const POLL_INTERVAL_MS = 2000;
const STORAGE_KEY = 'akya-ui-state';

interface PersistedAppState {
  tasks: Task[];
  selectedTaskId: string | null;
}

function isPersistedMessage(value: unknown): value is Message {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as Message).id === 'string' &&
    typeof (value as Message).content === 'string' &&
    typeof (value as Message).isUser === 'boolean'
  );
}

function isPersistedTask(value: unknown): value is Task {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as Task).id === 'string' &&
    typeof (value as Task).title === 'string' &&
    Array.isArray((value as Task).messages) &&
    (value as Task).messages.every(isPersistedMessage)
  );
}

function loadPersistedState(): PersistedAppState {
  if (typeof window === 'undefined') {
    return { tasks: [], selectedTaskId: null };
  }

  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return { tasks: [], selectedTaskId: null };
    }

    const parsed = JSON.parse(rawState) as Partial<PersistedAppState>;
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks.filter(isPersistedTask) : [];
    const selectedTaskId = typeof parsed.selectedTaskId === 'string' ? parsed.selectedTaskId : null;
    const hasSelectedTask = tasks.some((task) => task.id === selectedTaskId);

    return {
      tasks,
      selectedTaskId: hasSelectedTask ? selectedTaskId : (tasks[0]?.id ?? null)
    };
  } catch (error) {
    console.error('Failed to restore persisted task history:', error);
    return { tasks: [], selectedTaskId: null };
  }
}

function App() {
  const initialStateRef = useRef<PersistedAppState | null>(null);
  if (initialStateRef.current === null) {
    initialStateRef.current = loadPersistedState();
  }

  const [tasks, setTasks] = useState<Task[]>(initialStateRef.current.tasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialStateRef.current.selectedTaskId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [agentDecisions, setAgentDecisions] = useState<string[]>([]);
  const [agentCode, setAgentCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isClearingMemory, setIsClearingMemory] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isOpeningShareFolder, setIsOpeningShareFolder] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const isRunningRef = useRef(false);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const selectedTaskTitle = selectedTask?.title || 'Automation Workspace';
  const selectedMessages = selectedTask?.messages || [];

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    if (tasks.length === 0) {
      if (selectedTaskId !== null) {
        setSelectedTaskId(null);
      }
      return;
    }

    if (!selectedTaskId || !tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [selectedTaskId, tasks]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tasks, selectedTaskId })
      );
    } catch (error) {
      console.error('Failed to persist task history:', error);
    }
  }, [selectedTaskId, tasks]);

  const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const createAndSelectTask = () => {
    const newTask: Task = {
      id: createId(),
      title: 'New Task',
      messages: []
    };
    setTasks((prev) => [newTask, ...prev]);
    setSelectedTaskId(newTask.id);
    setAgentDecisions([]);
    setAgentCode('');
    return newTask.id;
  };

  const handleNewTask = () => {
    createAndSelectTask();
  };

  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find((task) => task.id === taskId);
    if (!taskToDelete) {
      return;
    }

    const shouldDelete = typeof window === 'undefined'
      ? true
      : window.confirm(`Delete "${taskToDelete.title}"?`);

    if (!shouldDelete) {
      return;
    }

    if (taskId === runningTaskId) {
      await handleStopExecution();
      setRunningTaskId(null);
      setRunStartedAt(null);
    }

    const remainingTasks = tasks.filter((task) => task.id !== taskId);
    setTasks(remainingTasks);

    if (taskId === selectedTaskId) {
      setSelectedTaskId(remainingTasks[0]?.id ?? null);
    }
  };

  const handleSendMessage = (content: string, inputMode: InputMode) => {
    const taskId = selectedTaskId ?? createAndSelectTask();
    addMessage(taskId, content, inputMode);
  };

  const handleStopExecution = async () => {
    if (currentJobId) {
      try {
        await fetch(`${API_BASE_URL}/api/stop-task/${currentJobId}`, { method: 'POST' });
      } catch (error) {
        console.error('Failed to stop task:', error);
      }
    }
    isRunningRef.current = false;
    setIsRunning(false);
    setCurrentJobId(null);
    setRunningTaskId(null);
  };

  const handleClearMemory = async () => {
    if (isRunning || isClearingMemory) {
      return;
    }

    const shouldClear = typeof window === 'undefined'
      ? true
      : window.confirm('Clear Akya memory history?');

    if (!shouldClear) {
      return;
    }

    setIsClearingMemory(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/clear-memory`, { method: 'POST' });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to clear memory file');
      }

      setAgentDecisions((prev) => ['Memory cleared.', ...prev.filter((entry) => entry !== 'Memory cleared.')]);
      setAgentCode('// memory.txt cleared');
    } catch (error) {
      const rawErrorMessage = error instanceof Error ? error.message : 'Unknown error while clearing memory';
      setAgentDecisions([`Failed to clear memory: ${rawErrorMessage}`]);
      setAgentCode(`// Error\n${rawErrorMessage}`);
    } finally {
      setIsClearingMemory(false);
    }
  };

  const handleShareConversation = async () => {
    if (isRunning || isSharing || isOpeningShareFolder) {
      return;
    }

    setIsSharing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/share-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedTaskTitle,
          messages: selectedMessages
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create share file');
      }

      const data = (await response.json()) as ShareResponse;
      const successMessage = data.fileName
        ? `Share saved: ${data.fileName}`
        : 'Share file created.';

      setAgentDecisions((prev) => [successMessage, ...prev.filter((entry) => entry !== successMessage)]);
      setAgentCode(data.filePath ? `// Shared transcript saved to\n${data.filePath}` : '// Shared transcript saved');
    } catch (error) {
      const rawErrorMessage = error instanceof Error ? error.message : 'Unknown error while creating share file';
      setAgentDecisions([`Failed to share transcript: ${rawErrorMessage}`]);
      setAgentCode(`// Error\n${rawErrorMessage}`);
    } finally {
      setIsSharing(false);
    }
  };

  const handleOpenShareFolder = async () => {
    if (isSharing || isOpeningShareFolder) {
      return;
    }

    setIsOpeningShareFolder(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/open-share-folder`, { method: 'POST' });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to open share folder');
      }

      const data = (await response.json()) as ShareResponse;
      const successMessage = data.shareDirectoryPath
        ? `Share folder opened: ${data.shareDirectoryPath}`
        : 'Share folder opened.';

      setAgentDecisions((prev) => [successMessage, ...prev.filter((entry) => entry !== successMessage)]);
    } catch (error) {
      const rawErrorMessage = error instanceof Error ? error.message : 'Unknown error while opening share folder';
      setAgentDecisions([`Failed to open share folder: ${rawErrorMessage}`]);
      setAgentCode(`// Error\n${rawErrorMessage}`);
    } finally {
      setIsOpeningShareFolder(false);
    }
  };

  const addMessage = (taskId: string, content: string, inputMode: InputMode) => {
    const userMessage: Message = {
      id: createId(),
      content,
      isUser: true
    };
    const assistantMessage: Message = {
      id: createId(),
      content: 'Submitting task to backend...',
      isUser: false
    };

    setTasks((prev) => prev.map((task) => {
      if (task.id === taskId) {
        const updatedMessages = [...task.messages, userMessage, assistantMessage];
        return {
          ...task,
          title: task.messages.length === 0 ? content.slice(0, 50) : task.title,
          messages: updatedMessages
        };
      }
      return task;
    }));

    setAgentDecisions(['Submitting task to backend']);
    setAgentCode('// Waiting for backend');
    setRunningTaskId(taskId);
    setRunStartedAt(Date.now());
    isRunningRef.current = true;
    setIsRunning(true);
    void runAutomationTask(taskId, assistantMessage.id, content, inputMode);
  };

  const updateAssistantMessage = (taskId: string, messageId: string, content: string) => {
    setTasks((prev) => prev.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      return {
        ...task,
        messages: task.messages.map((message) => (
          message.id === messageId ? { ...message, content } : message
        ))
      };
    }));
  };

  const applyAutomationResponse = (
    taskId: string,
    assistantMessageId: string,
    data: AutomationResponse
  ) => {
    const rawOutput = data.rawOutput?.trim() || '';
    const assistantText = rawOutput || data.message?.trim() || 'Task accepted and processed by backend.';
    updateAssistantMessage(taskId, assistantMessageId, assistantText);

    const outputLines = rawOutput
      ? rawOutput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      : [];

    setAgentDecisions(
      data.decisions && data.decisions.length > 0
        ? data.decisions
        : outputLines.length > 0
          ? outputLines.slice(-12)
          : [`Status: ${data.status ?? 'unknown'}`]
    );

    if (data.generatedCode?.trim()) {
      setAgentCode(data.generatedCode.trim());
      return;
    }

    if (data.status === 'running' || data.status === 'queued') {
      setAgentCode('// Waiting for generated code from backend');
      return;
    }

    setAgentCode('// No code generated by backend');
  };

  const pollAutomationTask = async (
    taskId: string,
    assistantMessageId: string,
    jobId: string
  ) => {
    while (isRunningRef.current) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      if (!isRunningRef.current) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/run-task/${jobId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to poll backend status');
      }

      const data = (await response.json()) as AutomationResponse;
      applyAutomationResponse(taskId, assistantMessageId, data);

      if (data.status !== 'running' && data.status !== 'queued') {
        isRunningRef.current = false;
        setIsRunning(false);
        setCurrentJobId(null);
        setRunningTaskId(null);
        return;
      }
    }
  };

  const runAutomationTask = async (
    taskId: string,
    assistantMessageId: string,
    content: string,
    inputMode: InputMode
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/run-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: content, inputMode })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Backend request failed');
      }

      const data = (await response.json()) as AutomationResponse;
      applyAutomationResponse(taskId, assistantMessageId, data);

      if (data.jobId && (data.status === 'running' || data.status === 'queued')) {
        setCurrentJobId(data.jobId);
        await pollAutomationTask(taskId, assistantMessageId, data.jobId);
      } else {
        isRunningRef.current = false;
        setIsRunning(false);
        setRunningTaskId(null);
      }
    } catch (error) {
      const rawErrorMessage = error instanceof Error ? error.message : 'Unknown backend error';
      const errorMessage = rawErrorMessage === 'Failed to fetch'
        ? 'Cannot reach the local backend. Start the app with npm run dev from swayat-ui.'
        : rawErrorMessage;
      updateAssistantMessage(taskId, assistantMessageId, `Backend error: ${errorMessage}`);

      setAgentDecisions(['Failed to call automation backend']);
      setAgentCode(`// Error\n${errorMessage}`);
      isRunningRef.current = false;
      setIsRunning(false);
      setCurrentJobId(null);
      setRunningTaskId(null);
    }
  };

  return (
    <div className="h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="flex h-full overflow-hidden">
        {isSidebarOpen ? (
          <Sidebar
            tasks={tasks}
            onNewTask={handleNewTask}
            onSelectTask={setSelectedTaskId}
            onDeleteTask={handleDeleteTask}
            selectedTaskId={selectedTaskId}
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            taskTitle={selectedTaskTitle}
            messageCount={selectedMessages.length}
            isRunning={isRunning}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            onTogglePanel={() => setIsPanelOpen(!isPanelOpen)}
            isPanelOpen={isPanelOpen}
            onShare={handleShareConversation}
            onOpenShareFolder={handleOpenShareFolder}
            isSharing={isSharing}
            isOpeningShareFolder={isOpeningShareFolder}
          />
          <ChatWindow
            taskTitle={selectedTaskTitle}
            messages={selectedMessages}
            isRunning={isRunning}
          />
          <InputBox onSend={handleSendMessage} isRunning={isRunning} onStop={handleStopExecution} />
        </div>
        <AgentPanel
          isOpen={isPanelOpen}
          taskTitle={selectedTaskTitle}
          isRunning={isRunning}
          runStartedAt={runStartedAt}
          decisions={agentDecisions}
          code={agentCode}
          onClearMemory={handleClearMemory}
          isClearingMemory={isClearingMemory}
        />
      </div>
    </div>
  );
}

export default App;
