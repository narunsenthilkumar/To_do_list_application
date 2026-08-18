const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const appDir = path.join(process.env.LOCALAPPDATA, 'Programs', 'Taskora');
const exePath = path.join(appDir, 'Taskora.exe');

console.log('Testing installed Taskora executable at:', exePath);
if (!fs.existsSync(exePath)) {
  console.error('ERROR: Installed executable does not exist at:', exePath);
  process.exit(1);
}

const child = spawn(exePath, ['--enable-logging'], {
  detached: false,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stdoutData = '';
let stderrData = '';

child.stdout.on('data', (d) => {
  const text = d.toString();
  stdoutData += text;
  console.log('[Taskora STDOUT]:', text.trim());
});

child.stderr.on('data', (d) => {
  const text = d.toString();
  stderrData += text;
  console.log('[Taskora STDERR]:', text.trim());
});

child.on('error', (err) => {
  console.error('[Taskora SPAWN ERROR]:', err);
});

child.on('exit', (code, signal) => {
  console.log(`[Taskora Process Exited] code: ${code}, signal: ${signal}`);
});

setTimeout(() => {
  console.log('--- 6 Second Diagnostic Check ---');
  console.log('Process running PID:', child.pid);
  console.log('Killing test instance...');
  child.kill('SIGTERM');
  setTimeout(() => {
    try {
      process.kill(child.pid, 'SIGKILL');
    } catch {}
    console.log('Diagnostic test completed successfully!');
    process.exit(0);
  }, 1000);
}, 6000);
