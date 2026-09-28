// Is there a newer release on GitHub? This only reads the latest release's
// version and page; nothing is downloaded or installed.

export const LATEST_RELEASE = 'https://api.github.com/repos/HuaiYue1/DeepSeek-Pet/releases/latest';

// Whether version a is newer than version b, e.g. '1.10.0' than '1.9.2'.
export function isNewer(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

// The latest release as { version, url }, fetched with `fetch` (Electron's
// net.fetch in the app, so it goes through the system proxy).
export async function latestRelease(fetch) {
  const res = await fetch(LATEST_RELEASE, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'DeepSeek-Pet' } });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const { tag_name: tag, html_url: url } = await res.json();
  return { version: String(tag).replace(/^v/, ''), url };
}
