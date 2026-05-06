import fs from 'fs';
import path from 'path';
import electron from 'electron';
const { app } = electron;

// Why JSON instead of SQLite?
// We initially used node:sqlite (native in Node 22.5+) to avoid native module
// dependencies. However, Electron 41.5.0 (bundling Node v24.14.0) does not
// include the node:sqlite module in its built binaries — importing it throws
// ERR_UNKNOWN_BUILTIN_MODULE. Attempts to enable it via --experimental-sqlite
// flag also fail because Electron's CLI parser rejects the flag. The regression
// fix (PR #47706) backported to Electron 36-38 does not cover our version.
// better-sqlite3 is broken with latest Electron. So we use a simple JSON dump
// for settings persistence. We only store a handful of values and write infrequently.

const SETTINGS_FILE = path.join(app.getPath('userData'), 'config.json');

interface SettingsMap {
  [key: string]: string;
}

function loadSettings(): SettingsMap {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(data) as SettingsMap;
    }
  } catch {
    // Corrupted file — start fresh
  }
  return {};
}

function saveSettings(settings: SettingsMap): void {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

let settings: SettingsMap = loadSettings();

export function getSetting(key: string): string | undefined {
  return settings[key];
}

export function setSetting(key: string, value: string): void {
  settings[key] = value;
  saveSettings(settings);
}
