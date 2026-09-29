// DeepSeek-Pet — Electron main process.
//
// One small frameless, transparent, always-on-top window holds the pet and
// her speech bubble. The window ignores the mouse except over her own
// pixels (the renderer tells us), so the desktop underneath stays usable.

import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, net, screen, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATES, MORE_LINES, EVENT_LINES } from '../art/states.mjs';
import { isNewer, latestRelease } from './update.js';
import { surroundings, walkStep } from './walkway.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const spriteDir = path.join(here, '..', 'art', 'png');

// Pet height in logical pixels. The sprites are about 1300 px tall, enough
// for the largest size on a 4K screen at 200% scaling.
const SIZES = {
  small: { label: '小', height: 240 },
  medium: { label: '中', height: 300 },
  large: { label: '大', height: 380 },
  xlarge: { label: '特大', height: 480 },
};
const BUBBLE_ROOM = 72; // space above her for the speech bubble
const MIN_WIDTH = 340; // wide enough for the bubble
// Room around her, in pet heights, so she isn't cut off when she swings
// while carried.
const SWING_ROOM = 0.26; // on each side
const FLOOR_ROOM = 0.06; // below her feet

const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

let win = null;
let tray = null;
let settings = { size: 'medium', onTop: true, roam: true, crossScreens: true, x: null, y: null };
let sprites = {};
let spriteSize = [341, 644];
let drag = null;
let hop = null; // hopping between screens: the timer moving her
let saveTimer = null;
let update = null; // a newer release, once found: { version, url }

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    settings = { ...settings, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch {
    // first run: keep the defaults
  }
  if (!SIZES[settings.size]) settings.size = 'medium';
}

// Saves where she is now too, so a save for some other setting never
// writes an old position (or drops one that was about to be saved).
function saveSettings() {
  clearTimeout(saveTimer);
  if (win && !drag) [settings.x, settings.y] = win.getPosition();
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
}

// Remember where she is once she has stopped moving for a moment.
function savePositionSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSettings, 800);
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
  const floor = Math.round(petH * FLOOR_ROOM);
  const width = Math.max(petW + 2 * Math.round(petH * SWING_ROOM), MIN_WIDTH);
  return { petW, petH, floor, width, height: BUBBLE_ROOM + petH + floor };
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
    ? { x: area.x + area.width - g.width - 40, y: area.y + area.height - g.height + g.floor }
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
    title: 'DeepSeek-Pet',
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
  win.on('blur', () => {
    if (!drag) return;
    finishDrag();
    send({ type: 'drag-end' });
  });
  win.on('moved', () => {
    if (!drag) savePositionSoon(); // a drag saves when it ends
  });
}

function send(command) {
  win?.webContents.send('pet:command', command);
}

function resize(size) {
  const before = win.getBounds();
  const old = geometry();
  const g = geometry(size);
  settings.size = size;
  // keep her feet where they were
  win.setBounds({
    x: Math.round(before.x + (before.width - g.width) / 2),
    y: before.y + before.height - old.floor - (g.height - g.floor),
    width: g.width,
    height: g.height,
  });
  saveSettings();
  send({ type: 'geometry', geometry: g });
}

function setRoam(roam) {
  settings.roam = roam;
  saveSettings();
  send({ type: 'roam', on: roam });
}

function setCrossScreens(cross) {
  settings.crossScreens = cross;
  saveSettings();
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
    { label: '自己走动', type: 'checkbox', checked: settings.roam, click: (item) => setRoam(item.checked) },
    { label: '跨屏幕走动', type: 'checkbox', checked: settings.crossScreens, enabled: settings.roam, click: (item) => setCrossScreens(item.checked) },
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
  template.push({ type: 'separator' });
  if (update) template.push({ label: `下载新版本 v${update.version}`, click: () => shell.openExternal(update.url) });
  template.push({ label: '检查更新', click: () => checkForUpdate(true) });
  template.push({ type: 'separator' }, { label: '隐藏', click: () => win.hide() }, { label: '退出', click: () => app.quit() });
  return Menu.buildFromTemplate(template);
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(here, 'tray.png'));
  tray = new Tray(icon);
  tray.setToolTip('DeepSeek-Pet');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示 / 隐藏', click: toggleVisible },
    { label: '说点什么', click: () => send({ type: 'say' }) },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]));
  if (!isMac) tray.on('click', toggleVisible);
}

// ---------------------------------------------------------------- updates

// Look for a newer release now and then and have her mention it; the menu
// then offers its download page. `asked`: from the menu, so also say when
// there is nothing new or the check failed.
async function checkForUpdate(asked = false) {
  try {
    const latest = await latestRelease(net.fetch);
    if (isNewer(latest.version, app.getVersion())) {
      update = latest;
      send({ type: 'update', version: latest.version });
    } else if (asked) {
      send({ type: 'update', upToDate: true, version: app.getVersion() });
    }
  } catch {
    if (asked) send({ type: 'update', failed: true });
  }
}

// ---------------------------------------------------------------- IPC

ipcMain.handle('pet:init', () => ({
  states: STATES,
  moreLines: MORE_LINES,
  eventLines: EVENT_LINES,
  roam: settings.roam,
  version: app.getVersion(),
  sprites,
  geometry: geometry(),
}));

ipcMain.on('pet:ignore', (_e, ignore) => {
  if (!isLinux) win?.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.on('pet:menu', () => contextMenu().popup({ window: win }));

// Dragging follows the cursor from here, so it keeps up even when the
// pointer runs ahead of the window. The renderer asks for a step every
// animation frame, so the window moves in step with the screen; a timer
// covers for it if frames stall. Small moves count as a click.
function finishDrag() {
  if (!drag) return false;
  clearInterval(drag.timer);
  const { moved } = drag;
  drag = null;
  if (moved) saveSettings();
  return moved;
}

function follow() {
  const p = screen.getCursorScreenPoint();
  const dx = p.x - drag.cursor.x;
  const dy = p.y - drag.cursor.y;
  if (!drag.moved && Math.hypot(dx, dy) < 4) return;
  if (!drag.moved) {
    drag.moved = true;
    send({ type: 'drag-begin' });
  }
  const x = Math.round(drag.x + dx);
  const y = Math.round(drag.y + dy);
  if (x === drag.at[0] && y === drag.at[1]) return;
  drag.at = [x, y];
  // setBounds rather than setPosition: on Windows with fractional scaling
  // repeated setPosition calls make the window creep bigger
  win.setBounds({ x, y, width: drag.width, height: drag.height });
}

ipcMain.on('pet:drag-start', () => {
  finishDrag();
  if (hop) {
    clearInterval(hop); // caught in mid-hop
    hop = null;
  }
  const cursor = screen.getCursorScreenPoint();
  const { x, y, width, height } = win.getBounds();
  drag = { cursor, x, y, width, height, at: [x, y], moved: false, tick: Date.now() };
  drag.timer = setInterval(() => {
    if (Date.now() - drag.tick > 100) follow();
  }, 16);
});

// returns where the window is now, for her swing
ipcMain.handle('pet:drag-tick', () => {
  if (!drag) return null;
  drag.tick = Date.now();
  follow();
  return drag.at;
});

ipcMain.handle('pet:drag-end', () => ({ moved: finishDrag() }));

// Walking on her own (see walkway.js): a step of dx along her floor; at the
// edge of her screen she stops, or walks on to the next screen if allowed,
// hopping up or down onto its floor when it is at another height. Returns
// how far she moved, and how long a hop takes if she started one.
ipcMain.handle('pet:walk', (_e, dx) => {
  if (hop) return { moved: 0, busy: true };
  if (drag || !win || !Number.isFinite(dx)) return { moved: 0 };
  const b = win.getBounds();
  const g = geometry();
  const pet = { w: g.petW, h: g.petH, floor: g.floor };
  const to = walkStep({ ...b, width: g.width, height: g.height }, dx, pet, screen.getAllDisplays(), settings.crossScreens);
  if (to.hop) return { moved: to.x - b.x, hop: hopTo(b, to, g) };
  if (to.x !== b.x) {
    // her own size rather than getBounds()'s, which can creep with fractional scaling
    win.setBounds({ x: Math.round(to.x), y: b.y, width: g.width, height: g.height });
    savePositionSoon();
  }
  return { moved: Math.round(to.x) - b.x };
});

// A little jump in an arc from where she is to `to`; returns how long it takes.
function hopTo(from, to, g) {
  const ms = 450;
  const rise = 40 + Math.max(0, from.y - to.y); // higher when jumping up
  const start = Date.now();
  hop = setInterval(() => {
    const t = Math.min(1, (Date.now() - start) / ms);
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t - rise * 4 * t * (1 - t);
    win?.setBounds({ x: Math.round(x), y: Math.round(y), width: g.width, height: g.height });
    if (t >= 1) {
      clearInterval(hop);
      hop = null;
      savePositionSoon();
    }
  }, 16);
  return ms;
}

// What is around her: is she standing on the taskbar (or Dock), and is
// there a screen to walk on to either side?
ipcMain.handle('pet:where', () => {
  if (!win) return {};
  const g = geometry();
  const here = surroundings({ ...win.getBounds(), width: g.width, height: g.height }, { w: g.petW, h: g.petH, floor: g.floor },
    screen.getAllDisplays(), settings.roam && settings.crossScreens);
  return { onTaskbar: here.taskbar >= 20, left: here.left, right: here.right };
});

// Pretending to click the taskbar: be in front of it while she does.
ipcMain.on('pet:raise', () => {
  if (settings.onTop) win?.moveTop();
});

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
    setTimeout(checkForUpdate, 20000);
    setInterval(checkForUpdate, 12 * 3600 * 1000);
  });
  app.on('window-all-closed', () => app.quit());
}
