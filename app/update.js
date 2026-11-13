const REPO = 'HuaiYue1/DeepSeek-Pet';
export const LATEST_RELEASE = `https://api.github.com/repos/${REPO}/releases/latest`;

// Whether version a is newer than version b, e.g. '1.10.0' than '1.9.2'.
export function isNewer(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

// Electron's net.fetch uses the system proxy.
export async function latestRelease(fetch) {
  const res = await fetch(LATEST_RELEASE, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'DeepSeek-Pet' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const { tag_name: tag, assets = [] } = await res.json();
  if (typeof tag !== 'string' || !/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error('Unexpected release tag');
  const version = tag.slice(1);
  const installer = `DeepSeek-Pet-Setup-${version}.exe`;
  const uploaded = (name) => assets.some((asset) => asset.name === name && asset.state === 'uploaded');
  return {
    tag,
    version,
    url: `https://github.com/${REPO}/releases/tag/${tag}`,
    installer: uploaded('latest.yml') && uploaded(installer) ? installer : null,
  };
}

export function canInstallUpdate({ platform, packaged, portable, hasConfig }) {
  return platform === 'win32' && packaged && !portable && hasConfig;
}

// Keep the installer tied to the release we just checked. The updater
// verifies the SHA-512 checksum during download before running the installer.
export async function installWindowsUpdate(updater, release, beforeDownload, beforeInstall) {
  if (!release.installer) return false;
  const result = await updater.checkForUpdates();
  const info = result?.updateInfo;
  const [file] = info?.files ?? [];
  if (!result?.isUpdateAvailable || info?.version !== release.version || info.tag !== release.tag
      || info.files?.length !== 1 || file?.url !== release.installer
      || typeof file.sha512 !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(file.sha512)) return false;
  beforeDownload();
  await updater.downloadUpdate();
  beforeInstall();
  updater.quitAndInstall(true, true);
  return true;
}
