// Version comparison for the update check. Run with `npm test`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canInstallUpdate, installWindowsUpdate, isNewer, latestRelease, LATEST_RELEASE } from '../app/update.js';

test('compares versions part by part, as numbers', () => {
  assert.equal(isNewer('1.1.0', '1.0.1'), true);
  assert.equal(isNewer('1.10.0', '1.9.2'), true);
  assert.equal(isNewer('2.0', '1.9.9'), true);
  assert.equal(isNewer('1.0.1', '1.0'), true);
  assert.equal(isNewer('1.0.1', '1.0.1'), false);
  assert.equal(isNewer('1.0.0', '1.0.1'), false);
});

test('only packaged Windows installers can update in place', () => {
  const installed = { platform: 'win32', packaged: true, portable: false, hasConfig: true };
  assert.equal(canInstallUpdate(installed), true);
  for (const variant of [{ platform: 'darwin' }, { platform: 'linux' }, { packaged: false },
    { portable: true }, { hasConfig: false }]) {
    assert.equal(canInstallUpdate({ ...installed, ...variant }), false);
  }
});

const releaseTag = 'v1.4.1';
const installerName = 'DeepSeek-Pet-Setup-1.4.1.exe';
const installerInfo = { url: installerName, sha512: Buffer.alloc(64).toString('base64') };

test('the release must have both an uploaded installer and its update metadata', async () => {
  const fetchRelease = (names) => latestRelease(async (url) => {
    assert.equal(url, LATEST_RELEASE);
    return {
      ok: true,
      json: async () => ({
        tag_name: releaseTag,
        html_url: 'https://example.com/other',
        assets: names.map((name) => ({ name, state: 'uploaded' })),
      }),
    };
  });
  const release = await fetchRelease([installerName, 'latest.yml']);
  assert.equal(release.installer, installerName);
  assert.equal(release.url, 'https://github.com/HuaiYue1/DeepSeek-Pet/releases/tag/v1.4.1');
  assert.equal((await fetchRelease([installerName])).installer, null);
  assert.equal((await fetchRelease(['DeepSeek-Pet-1.4.1-portable.exe', 'latest.yml'])).installer, null);
});

test('downloads before saving settings and requesting a restart', async () => {
  const release = { tag: releaseTag, version: '1.4.1', installer: installerName };
  const steps = [];
  const updater = {
    checkForUpdates: async () => ({
      isUpdateAvailable: true,
      updateInfo: { tag: releaseTag, version: '1.4.1', files: [installerInfo] },
    }),
    downloadUpdate: async () => { steps.push('downloaded'); },
    quitAndInstall: (...flags) => { steps.push(flags); },
  };
  const install = () => installWindowsUpdate(updater, release,
    () => steps.push('downloading'), () => steps.push('saved'));
  assert.equal(await install(), true);
  assert.deepEqual(steps, ['downloading', 'downloaded', 'saved', [true, true]]);

  steps.length = 0;
  updater.downloadUpdate = async () => { throw new Error('checksum mismatch'); };
  await assert.rejects(install, /checksum mismatch/);
  assert.deepEqual(steps, ['downloading']);

  steps.length = 0;
  updater.checkForUpdates = async () => ({
    isUpdateAvailable: true,
    updateInfo: { tag: 'v1.4.2', version: '1.4.2', files: [installerInfo] },
  });
  assert.equal(await install(), false);
  assert.deepEqual(steps, []);
});

test('rejects manifests without a checksum or with an unexpected installer path', async () => {
  const release = { tag: releaseTag, version: '1.4.1', installer: installerName };
  for (const file of [{ url: installerName }, { ...installerInfo, url: 'https://example.com/setup.exe' }]) {
    const updater = {
      checkForUpdates: async () => ({
        isUpdateAvailable: true,
        updateInfo: { tag: releaseTag, version: '1.4.1', files: [file] },
      }),
      downloadUpdate: () => assert.fail('the manifest is invalid'),
    };
    assert.equal(await installWindowsUpdate(updater, release), false);
  }
});
