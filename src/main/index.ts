import electron from 'electron';
const { app, BrowserWindow, session, Menu } = electron;
import type { BrowserWindow as BrowserWindowType } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

import { registerIpcHandlers } from './ipc-handlers';
import { checkFfmpeg } from './services/ffprobe.service';

// Resolve __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable remote debugging for MCP server / Chrome DevTools
// Check both NODE_ENV and command line flag
const isDev =
  process.env.NODE_ENV === 'development' ||
  process.argv.includes('--remote-debugging-port=9222') ||
  process.argv.includes('--remote-debugging-port');
if (isDev) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

let mainWindow: BrowserWindowType | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
  });

  // Load from dist/ in both dev and production.
  // Using loadFile (not loadURL from Vite dev server) so local file:// resources
  // (videos, thumbnails) can be loaded without CORS issues. For HMR during dev,
  // run `npm run build` before each Electron launch.
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  // CSP headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline' http://localhost:*; img-src 'self' data: file: http://localhost:*; media-src 'self' file: http://localhost:*; connect-src 'self' http://localhost:*; font-src 'self';",
        ],
      },
    });
  });

  // Register all IPC handlers
  registerIpcHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      // Check ffmpeg availability before creating the window
      const ffmpegCheck = checkFfmpeg();
      if (!ffmpegCheck.available) {
        const { dialog } = electron;
        dialog.showErrorBox(
          'ffmpeg Not Found',
          'ffmpeg is required but not found in PATH.\nPlease install ffmpeg and restart the app.',
        );
      }

      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
