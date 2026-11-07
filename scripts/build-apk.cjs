const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORK_DIR = '/tmp/b33t-apk-pack';
const OUTPUT_APK = path.resolve(__dirname, '../public/b33t-music.apk');
const DIST_DIR = path.resolve(__dirname, '../dist');
const KEYSTORE_DIR = '/tmp/keystore';
const KEYSTORE_PATH = path.join(KEYSTORE_DIR, 'b33t.jks');

function buildApk() {
  console.log('[APK Builder] Packaging modern React SPA into signed Android APK (b33t-music.apk)...');

  // Ensure dist exists; if not, build it
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.log('[APK Builder] dist/index.html not found, executing vite build...');
    execSync('npm run build', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  }

  // Ensure keystore exists
  if (!fs.existsSync(KEYSTORE_PATH)) {
    fs.mkdirSync(KEYSTORE_DIR, { recursive: true });
    execSync(
      `keytool -genkeypair -v -keystore ${KEYSTORE_PATH} -alias b33tkey -keyalg RSA -keysize 2048 -validity 10000 -storepass b33tmusic -keypass b33tmusic -dname "CN=b33t Music, OU=Mobile, O=b33t, L=Global, S=Global, C=US"`,
      { stdio: 'pipe' }
    );
  }

  fs.rmSync(WORK_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(WORK_DIR, 'base'), { recursive: true });

  const pyScript = `
import os, zipfile, subprocess, shutil

base_apk = '${OUTPUT_APK}'
work_dir = '${WORK_DIR}'
dist_dir = '${DIST_DIR}'
keystore_path = '${KEYSTORE_PATH}'
out_apk = '${OUTPUT_APK}'

base_folder = os.path.join(work_dir, 'base')

# 1. If base_apk exists, extract base Android binaries (AndroidManifest, classes.dex, resources.arsc, res)
if os.path.exists(base_apk):
    with zipfile.ZipFile(base_apk, 'r') as zin:
        for item in zin.infolist():
            if not item.filename.startswith('assets/') and not item.filename.startswith('META-INF/'):
                zin.extract(item, base_folder)

# 2. Populate assets/ with dist files
assets_dir = os.path.join(base_folder, 'assets')
os.makedirs(assets_dir, exist_ok=True)

for root, dirs, files in os.walk(dist_dir):
    for f in files:
        if f.endswith('.apk') or f.endswith('.idsig'):
            continue
        full_path = os.path.join(root, f)
        rel_path = os.path.relpath(full_path, dist_dir)
        dest_path = os.path.join(assets_dir, rel_path)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        shutil.copy2(full_path, dest_path)

# 3. Create unaligned APK archive
unaligned_apk = os.path.join(work_dir, 'unaligned.apk')
with zipfile.ZipFile(unaligned_apk, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
    for root, dirs, files in os.walk(base_folder):
        for f in files:
            full_path = os.path.join(root, f)
            arcname = os.path.relpath(full_path, base_folder)
            zout.write(full_path, arcname)

# 4. Zipalign
aligned_apk = os.path.join(work_dir, 'aligned.apk')
subprocess.run(['zipalign', '-f', '-p', '4', unaligned_apk, aligned_apk], check=True)

# 5. Sign with apksigner (v1 + v2 + v3)
subprocess.run([
    'apksigner', 'sign',
    '--ks', keystore_path,
    '--ks-pass', 'pass:b33tmusic',
    '--key-pass', 'pass:b33tmusic',
    '--v1-signing-enabled', 'true',
    '--v2-signing-enabled', 'true',
    '--out', out_apk,
    aligned_apk
], check=True)

# Also copy to dist/b33t-music.apk
dist_apk = os.path.join(dist_dir, 'b33t-music.apk')
shutil.copy2(out_apk, dist_apk)
print(f"[APK Builder] Successfully built & signed {out_apk} ({os.path.getsize(out_apk)} bytes)")
`;

  execSync(`python3 -c "${pyScript.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  return OUTPUT_APK;
}

if (require.main === module) {
  buildApk();
}

module.exports = { buildApk };
