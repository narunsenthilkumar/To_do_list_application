const { app, BrowserWindow, ipcMain, dialog, Menu, Notification, shell, session, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

let mainWindow = null;
let localServer = null;
let localPort = null;
let voiceWorkerProcess = null;

// MIME type dictionary for local static web server
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json',
};

function getDistPath() {
  const candidates = [
    path.resolve(__dirname, '../dist'),
    path.join(app.getAppPath(), 'dist'),
    path.join(process.resourcesPath, 'app.asar/dist'),
    path.join(process.resourcesPath, 'dist'),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.existsSync(path.join(c, 'index.html'))) {
        return c;
      }
    } catch {}
  }
  return path.resolve(__dirname, '../dist');
}

function getAssetPath(...relativeSegments) {
  const candidates = [
    path.resolve(__dirname, '..', ...relativeSegments),
    path.join(app.getAppPath(), ...relativeSegments),
    path.join(process.resourcesPath, ...relativeSegments),
    path.join(process.resourcesPath, 'app.asar', ...relativeSegments),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        return c;
      }
    } catch {}
  }
  return path.resolve(__dirname, '..', ...relativeSegments);
}

function sendFile(res, filePath, contentType) {
  res.writeHead(200, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
    'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://127.0.0.1:* data: blob:;",
  });
  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => {
    console.error('[Static Server Stream Error]', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.end('Server Stream Error');
  });
  stream.pipe(res);
}

/**
 * Starts an embedded local HTTP server on 127.0.0.1 to serve the static Expo Web build.
 * This guarantees the HTML5 History API (Expo Router navigation) works flawlessly without
 * file:// origin restrictions or DOMException pushState security errors.
 */
function startLocalServer() {
  if (localPort) {
    return Promise.resolve(localPort);
  }

  return new Promise((resolve, reject) => {
    const distPath = getDistPath();

    localServer = http.createServer((req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://127.0.0.1');
        let pathname = decodeURIComponent(parsedUrl.pathname || '/');

        let filePath = path.normalize(path.join(distPath, pathname));

        // Prevent path traversal (case-insensitive on Windows)
        if (!filePath.toLowerCase().startsWith(distPath.toLowerCase())) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          return res.end('Forbidden');
        }

        // 1. Direct file match
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          return sendFile(res, filePath, contentType);
        }

        // 2. Directory match with index.html
        const dirIndex = path.join(filePath, 'index.html');
        if (fs.existsSync(dirIndex) && fs.statSync(dirIndex).isFile()) {
          return sendFile(res, dirIndex, 'text/html; charset=utf-8');
        }

        // 3. Fallback for static html routes
        const htmlRoute = filePath + '.html';
        if (fs.existsSync(htmlRoute) && fs.statSync(htmlRoute).isFile()) {
          return sendFile(res, htmlRoute, 'text/html; charset=utf-8');
        }

        // 4. SPA Fallback: serve root index.html for client routes (/today, /inbox, /projects, /calendar, /focus, /settings, /sync, etc.)
        const rootIndex = path.join(distPath, 'index.html');
        if (fs.existsSync(rootIndex) && fs.statSync(rootIndex).isFile()) {
          return sendFile(res, rootIndex, 'text/html; charset=utf-8');
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
        }
        res.end('Server Error: ' + err.message);
      }
    });

    // Listen on loopback interface with an OS-allocated available port
    localServer.listen(0, '127.0.0.1', () => {
      const address = localServer.address();
      localPort = address.port;
      resolve(localPort);
    });

    localServer.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Configure comprehensive media, audioCapture, and microphone permissions on Electron session
 */
function setupSessionPermissions(ses) {
  if (!ses) return;

  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    if (
      permission === 'media' ||
      permission === 'audioCapture' ||
      permission === 'microphone' ||
      permission === 'notifications'
    ) {
      return true;
    }
    return false;
  });

  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    if (
      permission === 'media' ||
      permission === 'audioCapture' ||
      permission === 'microphone' ||
      permission === 'notifications'
    ) {
      return callback(true);
    }
    callback(false);
  });
}

async function createWindow() {
  const iconPath = process.platform === 'win32'
    ? getAssetPath('assets/branding/taskora-icon.ico')
    : getAssetPath('assets/branding/taskora-icon.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Taskora',
    backgroundColor: '#0F172A',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webSecurity: true,
    },
  });

  // Remove default menu bar for clean Apple-inspired aesthetics
  Menu.setApplicationMenu(null);

  // Setup permissions on window session
  setupSessionPermissions(mainWindow.webContents.session);

  try {
    const port = await startLocalServer();
    const targetUrl = `http://127.0.0.1:${port}`;
    mainWindow.loadURL(targetUrl);
  } catch (error) {
    console.error('Failed to start local server, falling back to direct load:', error);
    const indexPath = path.join(getDistPath(), 'index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    }
  }

  mainWindow.on('closed', () => {
    stopVoiceWorker();
    mainWindow = null;
  });
}

// -----------------------------------------------------------------------------
// WINDOWS NATIVE SPEECH RECOGNITION (OFFLINE / SAPI .NET INTEGRATION)
// -----------------------------------------------------------------------------

function stopVoiceWorker() {
  if (voiceWorkerProcess) {
    console.log('[STT] Stopping Windows speech worker');
    try {
      voiceWorkerProcess.kill('SIGKILL');
    } catch {}
    voiceWorkerProcess = null;
  }
}

function startVoiceWorker(win) {
  stopVoiceWorker();
  console.log('[STT] Initializing Windows native speech recognition worker...');

  // PowerShell script executing Windows System.Speech offline dictation engine with Wait-Event event pump
  const psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[void][System.Reflection.Assembly]::LoadWithPartialName('System.Speech')
try {
  $engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine
  $engine.SetInputToDefaultAudioDevice()
  $grammar = New-Object System.Speech.Recognition.DictationGrammar
  $engine.LoadGrammar($grammar)

  Register-ObjectEvent -InputObject $engine -EventName SpeechHypothesized -Action {
    Write-Host "HYP:$($Event.SourceEventArgs.Result.Text)"
  } | Out-Null

  Register-ObjectEvent -InputObject $engine -EventName SpeechRecognized -Action {
    Write-Host "REC:$($Event.SourceEventArgs.Result.Text)"
  } | Out-Null

  Register-ObjectEvent -InputObject $engine -EventName AudioLevelUpdated -Action {
    Write-Host "LVL:$($Event.SourceEventArgs.AudioLevel)"
  } | Out-Null

  $engine.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
  Write-Host "STATUS:LISTENING"

  # Event loop pumping PowerShell events for up to 35 seconds of voice capture
  for ($i = 0; $i -lt 35; $i++) {
    $null = Wait-Event -Timeout 1
  }
} catch {
  Write-Host "ERR:$($_.Exception.Message)"
}
`;

  try {
    voiceWorkerProcess = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      psScript,
    ], {
      windowsHide: true,
    });

    voiceWorkerProcess.stdout.on('data', (data) => {
      const lines = data.toString('utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !win || win.isDestroyed()) continue;

        if (trimmed.startsWith('HYP:')) {
          const text = trimmed.slice(4).trim();
          if (text) {
            console.log('[STT] Interim result:', text);
            win.webContents.send('voice:onResult', { text, isFinal: false });
          }
        } else if (trimmed.startsWith('REC:')) {
          const text = trimmed.slice(4).trim();
          if (text) {
            console.log('[STT] Final recognized speech:', text);
            win.webContents.send('voice:onResult', { text, isFinal: true });
          }
        } else if (trimmed.startsWith('LVL:')) {
          const lvl = parseInt(trimmed.slice(4), 10);
          if (!isNaN(lvl)) {
            win.webContents.send('voice:onVolume', Math.min(100, Math.max(0, lvl)));
          }
        } else if (trimmed.startsWith('STATUS:LISTENING')) {
          console.log('[STT] Windows speech worker is actively listening.');
        } else if (trimmed.startsWith('ERR:')) {
          const err = trimmed.slice(4).trim();
          console.error('[STT ERROR]', err);
          win.webContents.send('voice:onError', err || 'Windows speech engine error.');
        }
      }
    });

    voiceWorkerProcess.stderr.on('data', (data) => {
      const errStr = data.toString().trim();
      if (errStr && win && !win.isDestroyed()) {
        console.warn('[STT Worker stderr]:', errStr);
      }
    });

    voiceWorkerProcess.on('close', (code) => {
      console.log('[STT] Windows speech worker closed with code:', code);
      voiceWorkerProcess = null;
      if (win && !win.isDestroyed()) {
        win.webContents.send('voice:onEnd');
      }
    });

    return true;
  } catch (err) {
    console.error('[STT ERROR] Spawn error:', err);
    if (win && !win.isDestroyed()) {
      win.webContents.send('voice:onError', 'Failed to initialize Windows speech worker.');
    }
    return false;
  }
}

// -----------------------------------------------------------------------------
// SECURE IPC HANDLERS
// -----------------------------------------------------------------------------

// Voice Recognition IPC Handlers
ipcMain.handle('voice:checkPermission', async () => {
  return 'granted';
});

ipcMain.handle('voice:startListening', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    return startVoiceWorker(win);
  }
  return false;
});

ipcMain.handle('voice:stopListening', async () => {
  stopVoiceWorker();
  return true;
});

ipcMain.handle('voice:openSettings', async () => {
  try {
    await shell.openExternal('ms-settings:privacy-microphone');
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('voice:getSystemDiagnostics', async () => {
  return {
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
    windowsSpeechAvailable: process.platform === 'win32',
  };
});

// System Clipboard IPC Handlers (Reliable Windows / Desktop Support)
ipcMain.handle('clipboard:writeText', async (event, text) => {
  try {
    clipboard.writeText(String(text || ''));
    return true;
  } catch (err) {
    console.warn('[Clipboard] Error writing to clipboard:', err);
    return false;
  }
});

ipcMain.handle('clipboard:readText', async () => {
  try {
    return clipboard.readText();
  } catch (err) {
    console.warn('[Clipboard] Error reading from clipboard:', err);
    return '';
  }
});

// Save File Dialog (For JSON Backup & CSV Export)
ipcMain.handle('dialog:saveFile', async (event, { defaultPath, content, filters }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save File — Taskora',
      defaultPath: defaultPath || 'Taskora-Backup.json',
      filters: filters || [
        { name: 'JSON Backup (*.json)', extensions: ['json'] },
        { name: 'CSV File (*.csv)', extensions: ['csv'] },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ],
    });

    if (canceled || !filePath) {
      return { success: false, isCancelled: true };
    }

    await fs.promises.writeFile(filePath, content, 'utf8');
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open File Dialog (For Restore Backup)
ipcMain.handle('dialog:openFile', async (event, { filters }) => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Backup File — Taskora',
      properties: ['openFile'],
      filters: filters || [
        { name: 'Taskora Backup (*.json)', extensions: ['json'] },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ],
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      return { success: false, isCancelled: true };
    }

    const filePath = filePaths[0];
    const content = await fs.promises.readFile(filePath, 'utf8');
    return { success: true, filePath, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Windows Native Desktop Notification
ipcMain.handle('notification:show', async (event, { title, body }) => {
  try {
    if (Notification.isSupported()) {
      const notifIcon = getAssetPath('assets/branding/taskora-icon.png');
      new Notification({
        title: title || 'Taskora',
        body: body || '',
        icon: fs.existsSync(notifIcon) ? notifIcon : undefined,
      }).show();
      return true;
    }
    return false;
  } catch {
    return false;
  }
});

// Window Controls
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// App Lifecycle
app.whenReady().then(() => {
  setupSessionPermissions(session.defaultSession);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopVoiceWorker();
  if (localServer) {
    try {
      localServer.close();
    } catch {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
