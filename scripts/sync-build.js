import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const docsDir = path.join(rootDir, 'docs');
const androidPublicDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public');

if (!fs.existsSync(distDir)) {
  console.error('[sync-build] Error: dist directory does not exist. Run vite build first.');
  process.exit(1);
}

const distIndexHtml = path.join(distDir, 'index.html');
if (!fs.existsSync(distIndexHtml)) {
  console.error('[sync-build] Error: dist/index.html not found.');
  process.exit(1);
}

const htmlContent = fs.readFileSync(distIndexHtml, 'utf8');
const scriptMatch = htmlContent.match(/src=["']\.\/assets\/([^"']+)["']/);
const cssMatch = htmlContent.match(/href=["']\.\/assets\/([^"']+)["']/);

console.log(`[sync-build] Detected bundle: JS: ${scriptMatch ? scriptMatch[1] : 'unknown'}, CSS: ${cssMatch ? cssMatch[1] : 'unknown'}`);

// 1. Sync to /docs (GitHub Pages)
try {
  fs.rmSync(docsDir, { recursive: true, force: true });
  fs.cpSync(distDir, docsDir, { recursive: true });
  // Guarantee .nojekyll for GitHub Pages
  fs.writeFileSync(path.join(docsDir, '.nojekyll'), '');
  console.log('[sync-build] Successfully synchronized /docs for GitHub Pages');
} catch (err) {
  console.error('[sync-build] Failed to sync /docs:', err);
}

// 2. Sync to /android/app/src/main/assets/public (Capacitor Android APK)
try {
  if (fs.existsSync(path.join(rootDir, 'android', 'app'))) {
    const cordovaJs = path.join(androidPublicDir, 'cordova.js');
    const cordovaPluginsJs = path.join(androidPublicDir, 'cordova_plugins.js');
    const savedCordova = fs.existsSync(cordovaJs) ? fs.readFileSync(cordovaJs) : null;
    const savedCordovaPlugins = fs.existsSync(cordovaPluginsJs) ? fs.readFileSync(cordovaPluginsJs) : null;

    fs.rmSync(androidPublicDir, { recursive: true, force: true });
    fs.cpSync(distDir, androidPublicDir, { recursive: true });

    if (savedCordova) fs.writeFileSync(cordovaJs, savedCordova);
    if (savedCordovaPlugins) fs.writeFileSync(cordovaPluginsJs, savedCordovaPlugins);
    console.log('[sync-build] Successfully synchronized /android public assets');
  }
} catch (err) {
  console.error('[sync-build] Failed to sync android assets:', err);
}
