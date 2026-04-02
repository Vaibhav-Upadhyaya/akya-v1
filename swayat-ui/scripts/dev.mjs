import { spawn } from 'node:child_process';

const viteEntry = 'node_modules/vite/bin/vite.js';

const children = [];

function startProcess(command, args, name) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`${name} stopped with signal ${signal}`);
    } else if (code !== 0) {
      console.log(`${name} exited with code ${code}`);
    }
  });

  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

startProcess(process.execPath, ['backend/server.js'], 'AKYA backend');
startProcess(process.execPath, [viteEntry], 'Vite dev server');
