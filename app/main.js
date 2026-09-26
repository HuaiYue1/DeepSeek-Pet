// 深深桌宠 — Electron main process.
//
// One small frameless, transparent, always-on-top window holds the pet and
// her speech bubble. The window ignores the mouse except over her own
// pixels (the renderer tells us), so the desktop underneath stays usable.

import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATES, MORE_LINES } from '../art/states.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const spriteDir = path.join(here, '..', 'art', 'png');

// Pet height in logical pixels. On a 4K screen at 150–200% scaling the
// medium size uses about as many physical pixels as the sprites have.
const SIZES = { small: { label: '小', height: 240 }, medium: { label: '中', height: 300 }, large: { label: '大', height: 380 } };
const BUBBLE_ROOM = 72; // space above the sprite for the speech bubble
const MIN_WIDTH = 300;

const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

let win = null;
let tray = null;
let settings = { size: 'medium', onTop: true, x: null, y: null };
let sprites = {};
let spriteSize = [341, 644];
let drag = null;

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    settings = { ...settings, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch {
    // first run: keep the defaults
  }
  if (!SIZES[settings.size]) settings.size = 'medium';
}

function saveSettings() {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
}

function loadSprites() {
  for (const key of Object.keys(STATES)) {
    const image = nativeImage.createFromPath(path.join(spriteDir, `${key}.png`));
    if (image.isEmpty()) continue;
    // data URLs keep the renderer's canvas untainted, so it can hit-test her pixels
    sprites[key] = image.toDataURL();
    const { width, height } = image.getSize();
    spriteSize = [width, height];
  }
}

function geometry(size = settings.size) {
  const petH = SIZES[size].height;
  const petW = Math.round((petH * spriteSize[0]) / spriteSize[1]);
  return { petW, petH, width: Math.max(petW + 60, MIN_WIDTH), height: petH + BUBBLE_ROOM };
}

// Keep the window on some screen, e.g. after a monitor was unplugged.
function onScreen(x, y, width, height) {
  const area = screen.getDisplayMatching({ x, y, width, height }).workArea;
  return {
    x: Math.min(Math.max(x, area.x - width / 2), area.x + area.width - width / 2),
    y: Math.min(Math.max(y, area.y), area.y + area.height - height / 2),
  };
}

function createWindow() {
  const g = geometry();
  const area = screen.getPrimaryDisplay().workArea;
  const start = settings.x == null
    ? { x: area.x + area.width - g.width - 40, y: area.y + area.height - g.height }
    : onScreen(settings.x, settings.y, g.width, g.height);

  win = new BrowserWindow({
    width: g.width,
    height: g.height,
    x: Math.round(start.x),
    y: Math.round(start.y),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: settings.onTop,
    show: false,
    title: '深深',
    webPreferences: {
      preload: path.join(here, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setAlwaysOnTop(settings.onTop, 'floating');
  if (isMac) win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Click-through until the pointer is over her. Linux can't forward mouse
  // moves to an ignoring window, so there the window just stays clickable.
  if (!isLinux) win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(here, 'index.html'));
  win.once('ready-to-show', () => win.showInactive());
  // if the mouse-up got lost, stop following the cursor once she loses focus
  win.on('blur', finishDrag);
  win.on('moved', () => {
    [settings.x, settings.y] = win.getPosition();
    saveSettings();
  });
}

function send(command) {
  win?.webContents.send('pet:command', command);
}

function resize(size) {
  const before = win.getBounds();
  const g = geometry(size);
  settings.size = size;
  // keep her feet where they were
  win.setBounds({
    x: Math.round(before.x + (before.width - g.width) / 2),
    y: before.y + before.height - g.height,
    width: g.width,
    height: g.height,
  });
  saveSettings();
  send({ type: 'geometry', geometry: g });
}

function setOnTop(onTop) {
  settings.onTop = onTop;
  win.setAlwaysOnTop(onTop, 'floating');
  saveSettings();
}

function toggleVisible() {
  if (win.isVisible()) win.hide();
  else win.showInactive();
}

function contextMenu() {
  const template = [
    { label: '说点什么', click: () => send({ type: 'say' }) },
    { label: '喂一个 Token', click: () => send({ type: 'state', key: 'eat' }) },
    { label: '深度思考一下', click: () => send({ type: 'state', key: 'think' }) },
    {
      label: '切换状态',
      submenu: Object.entries(STATES).map(([key, s]) => ({ label: s.name, click: () => send({ type: 'state', key }) })),
    },
    { type: 'separator' },
    {
      label: '大小',
      submenu: Object.entries(SIZES).map(([key, s]) => ({ label: s.label, type: 'radio', checked: settings.size === key, click: () => resize(key) })),
    },
    { label: '总在最前', type: 'checkbox', checked: settings.onTop, click: (item) => setOnTop(item.checked) },
  ];
  if (!isLinux) {
    template.push({
      label: '开机启动',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    });
  }
  template.push({ type: 'separator' }, { label: '隐藏', click: () => win.hide() }, { label: '退出', click: () => app.quit() });
  return Menu.buildFromTemplate(template);
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(here, 'tray.png'));
  tray = new Tray(icon);
  tray.setToolTip('深深');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示 / 隐藏', click: toggleVisible },
    { label: '说点什么', click: () => send({ type: 'say' }) },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]));
  if (!isMac) tray.on('click', toggleVisible);
}

// ---------------------------------------------------------------- IPC

ipcMain.handle('pet:init', () => ({
  states: STATES,
  moreLines: MORE_LINES,
  sprites,
  geometry: geometry(),
}));

ipcMain.on('pet:ignore', (_e, ignore) => {
  if (!isLinux) win?.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.on('pet:menu', () => contextMenu().popup({ window: win }));

// Dragging follows the cursor from here, so it keeps up even when the
// pointer runs ahead of the window. Small moves count as a click.
function finishDrag() {
  if (!drag) return false;
  clearInterval(drag.timer);
  const { moved } = drag;
  drag = null;
  if (moved) {
    [settings.x, settings.y] = win.getPosition();
    saveSettings();
  }
  return moved;
}

ipcMain.on('pet:drag-start', () => {
  finishDrag();
  const cursor = screen.getCursorScreenPoint();
  const { x, y, width, height } = win.getBounds();
  drag = { cursor, x, y, moved: false };
  drag.timer = setInterval(() => {
    const p = screen.getCursorScreenPoint();
    const dx = p.x - drag.cursor.x;
    const dy = p.y - drag.cursor.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      send({ type: 'drag-begin' });
    }
    // setBounds rather than setPosition: on Windows with fractional scaling
    // repeated setPosition calls make the window creep bigger
    win.setBounds({ x: Math.round(drag.x + dx), y: Math.round(drag.y + dy), width, height });
  }, 16);
});

ipcMain.handle('pet:drag-end', () => ({ moved: finishDrag() }));

// ---------------------------------------------------------------- app

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => win?.showInactive());
  app.whenReady().then(() => {
    if (isMac) app.dock?.hide();
    loadSettings();
    loadSprites();
    createWindow();
    createTray();
  });
  app.on('window-all-closed', () => app.quit());
}
