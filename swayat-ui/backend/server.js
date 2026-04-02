import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.AKYA_SERVER_PORT || 8787);
const PYTHON_BIN = process.env.PYTHON_BIN || 'python';
const DEFAULT_TIMEOUT_SECONDS = Number(process.env.AKYA_TIMEOUT_SECONDS || 300);
const DEFAULT_MAIN_PY_PATH = 'C:\\Users\\Vaibhav Upadhyaya\\OneDrive\\Documents\\MASTER\\antigravity files\\Akya\\main.py';
const MAIN_PY_PATH = process.env.AKYA_MAIN_PY || DEFAULT_MAIN_PY_PATH;
const MEMORY_FILE_PATH = path.join(path.dirname(MAIN_PY_PATH), 'memory.txt');
const SHARE_DIRECTORY_PATH = process.env.AKYA_SHARE_DIR || 'C:\\Users\\Vaibhav Upadhyaya\\OneDrive\\Documents\\MASTER\\akyaShares';
const BRIDGE_SCRIPT_PATH = fileURLToPath(new URL('./akya_bridge.py', import.meta.url));
const JOB_RETENTION_MS = 30 * 60 * 1000;
const NO_OUTPUT_WARNING_SECONDS = 15;
const STALLED_WARNING_SECONDS = 45;

const CODE_PATTERNS = [
  /^import\s+\w+/,
  /^from\s+\w+\s+import\s+/,
  /^def\s+\w+\(/,
  /^class\s+\w+/,
  /^if\s+.+:/,
  /^elif\s+.+:/,
  /^else:/,
  /^for\s+.+:/,
  /^while\s+.+:/,
  /^try:/,
  /^except\b/,
  /^with\s+.+:/,
  /^return\b/,
  /^[A-Za-z_]\w*\s*=/,
  /^\s{2,}[A-Za-z_]/,
  /^pyautogui\./,
  /^window\./,
  /^app\./
];

const CLASSIFICATION_LINES = new Set([
  'realtime',
  'fact',
  'talking',
  'system',
  'open webcam'
]);

const jobs = new Map();

function isPromptEchoLine(line) {
  return /^task\s*:\s*$/i.test(line.trim());
}

function isInternalStatusLine(line) {
  const trimmed = line.trim();
  return (
    /^Task submitted:/i.test(trimmed) ||
    /^Starting Akya bridge/i.test(trimmed) ||
    /^Python process started\./i.test(trimmed) ||
    /^Task completed successfully\.$/i.test(trimmed)
  );
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(body);
}

function createJobId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeFileNamePart(value) {
  const sanitized = String(value || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized.slice(0, 60) || 'akya-chat';
}

function createShareFileName(title) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${sanitizeFileNamePart(title)}-${timestamp}.txt`;
}

function openShareDirectory() {
  return new Promise((resolve, reject) => {
    const child = spawn('cmd.exe', ['/c', 'start', '', SHARE_DIRECTORY_PATH], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });

    child.on('error', reject);
    child.unref();
    resolve();
  });
}

function formatSharedTranscript(messages) {
  return messages.map((message) => {
    const speaker = message.isUser ? 'user' : 'bot';
    const lines = String(message.content || '').split(/\r?\n/);
    const [firstLine = '', ...remainingLines] = lines;
    return [`${speaker}: ${firstLine}`, ...remainingLines].join('\n');
  }).join('\n\n');
}

function cleanupJobs() {
  const now = Date.now();

  for (const [jobId, job] of jobs.entries()) {
    const isFinished = job.status !== 'queued' && job.status !== 'running';
    if (isFinished && now - job.updatedAt > JOB_RETENTION_MS) {
      jobs.delete(jobId);
    }
  }
}

function appendJobOutput(job, text) {
  if (!text) {
    return;
  }

  job.output += text;
  job.updatedAt = Date.now();

  if (text.trim()) {
    job.lastOutputAt = Date.now();
  }
}

function isDecisionLine(line) {
  const lower = line.toLowerCase();
  return (
    line.startsWith('ACTION:') ||
    lower.startsWith('input mode selected:') ||
    lower.startsWith('using provided task:') ||
    lower.startsWith('task classification:') ||
    lower.startsWith('confidence level:') ||
    lower.startsWith('reasoning:') ||
    lower.startsWith('suggested tools:') ||
    lower.includes('web automation task completed successfully') ||
    lower.includes('system automation task completed successfully') ||
    lower.startsWith('open ') ||
    lower === 'no'
  );
}

function normalizeDecisionLine(line) {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();

  if (CLASSIFICATION_LINES.has(lower)) {
    return `Task classification: ${lower}`;
  }

  return trimmed;
}

function isInspectorOnlyLine(line) {
  const lower = line.toLowerCase();
  return (
    lower.startsWith('input mode selected:') ||
    lower.startsWith('using provided task:') ||
    lower.startsWith('task classification:') ||
    CLASSIFICATION_LINES.has(lower)
  );
}

function isCodeLine(line) {
  const trimmed = line.trimEnd();
  if (!trimmed) {
    return false;
  }

  return CODE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function parseAutomationOutput(rawOutput) {
  const allLines = rawOutput
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => !isPromptEchoLine(line));

  const visibleLines = allLines.filter((line) => {
    const trimmed = line.trim();
    return trimmed && !isInternalStatusLine(trimmed);
  });
  const chatLines = visibleLines.filter((line) => !isInspectorOnlyLine(line.trim()));

  const decisions = [];
  const seenDecisions = new Set();
  const generatedCodeLines = [];

  for (const line of visibleLines) {
    const normalizedLine = normalizeDecisionLine(line);
    const trimmed = normalizedLine.trim();
    if (!trimmed) {
      continue;
    }

    if (isDecisionLine(trimmed)) {
      const key = trimmed.toLowerCase();
      if (!seenDecisions.has(key)) {
        seenDecisions.add(key);
        decisions.push(trimmed);
      }
    }

    if (isCodeLine(line)) {
      generatedCodeLines.push(line);
    }
  }

  const completionLine = visibleLines.find((line) => /task completed successfully/i.test(line));
  const lastNonEmptyLine = [...chatLines].reverse().find((line) => line.trim().length > 0);

  return {
    completionLine,
    lastNonEmptyLine,
    decisions,
    generatedCode: generatedCodeLines.join('\n').trim(),
    rawOutput: chatLines.join('\n').trim()
  };
}

function getLastMeaningfulOutputLine(parsed) {
  const outputLines = parsed.rawOutput
    ? parsed.rawOutput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : [];

  return [...outputLines].reverse().find((line) => !isPromptEchoLine(line)) || '';
}

function buildDiagnostics(job, parsed) {
  const now = Date.now();
  const runningSeconds = Math.max(1, Math.round((now - job.startedAt) / 1000));
  const idleSeconds = Math.max(0, Math.round((now - job.lastOutputAt) / 1000));
  const lastOutputLine = getLastMeaningfulOutputLine(parsed);
  const warnings = [];

  if ((job.status === 'running' || job.status === 'queued') && idleSeconds >= NO_OUTPUT_WARNING_SECONDS) {
    warnings.push(`No backend output for ${idleSeconds}s. Likely waiting on screenshot capture or an LLM response.`);
  }

  if ((job.status === 'running' || job.status === 'queued') && idleSeconds >= STALLED_WARNING_SECONDS) {
    warnings.push(`Run may be stalled. Python is alive, but there has been no visible progress for ${idleSeconds}s.`);
  }

  let stage = 'starting';
  if (job.status === 'completed') {
    stage = 'completed';
  } else if (job.status === 'failed') {
    stage = 'failed';
  } else if (job.status === 'timed_out') {
    stage = 'timed_out';
  } else if (parsed.generatedCode) {
    stage = 'generated_code';
  } else if (parsed.decisions.length > 0) {
    stage = 'planning_or_executing';
  } else if (lastOutputLine) {
    stage = 'running';
  }

  return {
    queryReceived: true,
    taskInjectedIntoPython: job.taskInjectedIntoPython,
    processStarted: Boolean(job.pid),
    processAlive: job.status === 'running' || job.status === 'queued',
    pid: job.pid,
    runningSeconds,
    idleSeconds,
    stage,
    lastOutputLine,
    warnings
  };
}

function buildJobMessage(job, parsed, diagnostics) {
  const latestLine = diagnostics.lastOutputLine;

  if (job.status === 'running' || job.status === 'queued') {
    if (diagnostics.idleSeconds >= NO_OUTPUT_WARNING_SECONDS) {
      return `Running for ${diagnostics.runningSeconds}s. Python received the task, but there has been no new backend output for ${diagnostics.idleSeconds}s.`;
    }

    if (latestLine) {
      return `Running for ${diagnostics.runningSeconds}s: ${latestLine}`;
    }

    return `Automation running for ${diagnostics.runningSeconds}s. Task was delivered to Python and the backend is starting.`;
  }

  if (job.status === 'timed_out') {
    return `Timed out after ${job.timeoutSeconds}s. Latest backend output is shown.`;
  }

  if (job.status === 'failed') {
    return job.error || parsed.lastNonEmptyLine || 'Automation backend failed.';
  }

  if (job.status === 'completed') {
    return parsed.completionLine || 'Automation completed. Latest output is shown in the panel.';
  }

  return parsed.lastNonEmptyLine || 'Automation completed.';
}

function uniqueLines(lines) {
  const seen = new Set();
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function serializeJob(job) {
  const parsed = parseAutomationOutput(job.output);
  const diagnostics = buildDiagnostics(job, parsed);
  const outputLines = parsed.rawOutput
    ? parsed.rawOutput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : [];

  const statusLines = [
    `Status: ${job.status}`,
    `Stage: ${diagnostics.stage}`,
    `Task delivered to Python input: ${diagnostics.taskInjectedIntoPython ? 'yes' : 'no'}`,
    `Python process started: ${diagnostics.processStarted ? 'yes' : 'no'}`,
    `Python process alive: ${diagnostics.processAlive ? 'yes' : 'no'}`,
    `Running for: ${diagnostics.runningSeconds}s`,
    `No output for: ${diagnostics.idleSeconds}s`
  ];

  const decisions = uniqueLines([
    ...statusLines,
    ...diagnostics.warnings,
    ...(parsed.decisions.length > 0 ? parsed.decisions : outputLines.slice(-12))
  ]);

  let generatedCode = parsed.generatedCode;
  if (!generatedCode && (job.status === 'running' || job.status === 'queued')) {
    generatedCode = '// Waiting for generated code from backend';
  } else if (!generatedCode && job.error) {
    generatedCode = `// ${job.error}`;
  }

  return {
    jobId: job.id,
    status: job.status,
    message: buildJobMessage(job, parsed, diagnostics),
    decisions,
    generatedCode,
    rawOutput: parsed.rawOutput,
    timedOut: job.status === 'timed_out',
    exitCode: job.exitCode,
    signal: job.signal,
    diagnostics,
    error: job.error,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt
  };
}

function normalizeInputMode(inputMode) {
  return inputMode === 'mic' ? 'mic' : 'type';
}

function startJob(task, inputMode, timeoutSeconds) {
  if (!existsSync(MAIN_PY_PATH)) {
    throw new Error(
      `main.py not found at: ${MAIN_PY_PATH}. Set AKYA_MAIN_PY env var to your correct file path.`
    );
  }

  cleanupJobs();

  const job = {
    id: createJobId(),
    task,
    inputMode,
    status: 'queued',
    output: `Task submitted: ${task}\nStarting Akya bridge...\n`,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    lastOutputAt: Date.now(),
    timeoutSeconds,
    exitCode: null,
    signal: null,
    error: '',
    child: null,
    pid: null,
    taskInjectedIntoPython: false
  };

  jobs.set(job.id, job);

  const child = spawn(PYTHON_BIN, ['-u', BRIDGE_SCRIPT_PATH], {
    cwd: path.dirname(MAIN_PY_PATH),
    windowsHide: true,
    env: {
      ...process.env,
      AKYA_TASK: task,
      AKYA_INPUT_MODE: inputMode,
      AKYA_MAIN_PY: MAIN_PY_PATH,
      AKYA_ENABLE_TTS: process.env.AKYA_ENABLE_TTS || '0',
      AKYA_SKIP_GREETING: process.env.AKYA_SKIP_GREETING || '1',
      AKYA_RUN_ONCE: '1',
      PYTHONIOENCODING: 'utf-8',
      PYTHONUTF8: '1',
      PYTHONUNBUFFERED: '1'
    }
  });

  job.child = child;
  job.pid = child.pid ?? null;
  job.taskInjectedIntoPython = true;
  job.status = 'running';
  appendJobOutput(job, 'Python process started.\n');

  child.stdout.on('data', (chunk) => {
    appendJobOutput(job, chunk.toString());
  });

  child.stderr.on('data', (chunk) => {
    appendJobOutput(job, chunk.toString());
  });

  child.on('error', (error) => {
    job.error = `Failed to start Python process: ${error.message}`;
    job.status = 'failed';
    appendJobOutput(job, `${job.error}\n`);
  });

  const timer = setTimeout(() => {
    if (job.status !== 'running') {
      return;
    }

    job.status = 'timed_out';
    appendJobOutput(job, `Timed out after ${timeoutSeconds}s.\n`);
    child.kill();
  }, Math.max(5, timeoutSeconds) * 1000);

  child.on('close', (code, signal) => {
    clearTimeout(timer);
    job.exitCode = code;
    job.signal = signal;
    job.updatedAt = Date.now();

    if (job.status === 'timed_out') {
      return;
    }

    if (code === 0) {
      job.status = 'completed';
      return;
    }

    job.status = 'failed';
    if (!job.error) {
      job.error = `Python process exited with code ${code ?? 'unknown'}.`;
      appendJobOutput(job, `${job.error}\n`);
    }
  });

  return job;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large'));
      }
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: 'Missing URL' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const { pathname } = url;

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, { ok: true, mainPyPath: MAIN_PY_PATH });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/run-task') {
    try {
      const rawBody = await readRequestBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const task = typeof body.task === 'string' ? body.task.trim() : '';
      const inputMode = normalizeInputMode(body.inputMode);

      if (!task) {
        sendJson(res, 400, { error: 'task is required' });
        return;
      }

      const timeoutSeconds =
        typeof body.timeoutSeconds === 'number' && Number.isFinite(body.timeoutSeconds)
          ? body.timeoutSeconds
          : DEFAULT_TIMEOUT_SECONDS;

      const job = startJob(task, inputMode, timeoutSeconds);
      sendJson(res, 202, serializeJob(job));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown server error';
      sendJson(res, 500, { error: message });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/clear-memory') {
    try {
      writeFileSync(MEMORY_FILE_PATH, '', 'utf8');
      sendJson(res, 200, { message: 'Memory cleared', memoryFilePath: MEMORY_FILE_PATH });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear memory file';
      sendJson(res, 500, { error: message });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/share-task') {
    try {
      const rawBody = await readRequestBody(req);
      const body = rawBody ? JSON.parse(rawBody) : {};
      const title = typeof body.title === 'string' ? body.title.trim() : 'Akya Chat';
      const messages = Array.isArray(body.messages)
        ? body.messages.filter((message) => (
          message
          && typeof message === 'object'
          && typeof message.content === 'string'
          && typeof message.isUser === 'boolean'
        ))
        : [];

      mkdirSync(SHARE_DIRECTORY_PATH, { recursive: true });

      const fileName = createShareFileName(title);
      const filePath = path.join(SHARE_DIRECTORY_PATH, fileName);
      const transcript = formatSharedTranscript(messages);

      writeFileSync(filePath, transcript, 'utf8');

      sendJson(res, 200, {
        message: 'Share file created',
        fileName,
        filePath,
        shareDirectoryPath: SHARE_DIRECTORY_PATH
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create share file';
      sendJson(res, 500, { error: message });
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/open-share-folder') {
    try {
      mkdirSync(SHARE_DIRECTORY_PATH, { recursive: true });
      await openShareDirectory();

      sendJson(res, 200, {
        message: 'Share folder opened',
        shareDirectoryPath: SHARE_DIRECTORY_PATH
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open share folder';
      sendJson(res, 500, { error: message });
    }
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/run-task/')) {
    const jobId = pathname.slice('/api/run-task/'.length);
    const job = jobs.get(jobId);

    if (!job) {
      sendJson(res, 404, { error: 'Job not found' });
      return;
    }

    sendJson(res, 200, serializeJob(job));
    return;
  }

  if (req.method === 'POST' && pathname.startsWith('/api/stop-task/')) {
    const jobId = pathname.slice('/api/stop-task/'.length);
    const job = jobs.get(jobId);

    if (!job) {
      sendJson(res, 404, { error: 'Job not found' });
      return;
    }

    if (job.child && (job.status === 'running' || job.status === 'queued')) {
      job.child.kill();
      job.status = 'failed';
      job.error = 'Stopped by user';
      appendJobOutput(job, '\nStopped by user\n');
    }

    sendJson(res, 200, { message: 'Job stopped' });
    return;
  }

  sendJson(res, 404, { error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`AKYA backend listening on http://localhost:${PORT}`);
  console.log(`Using main.py at: ${MAIN_PY_PATH}`);
});
