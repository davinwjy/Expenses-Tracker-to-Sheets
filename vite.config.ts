import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function syncGitHubAndAndroidAssetsPlugin() {
  return {
    name: 'sync-github-and-android-assets',
    closeBundle() {
      try {
        const distDir = path.resolve('dist');
        if (!fs.existsSync(distDir)) return;

        // 1. Sync to /docs for GitHub Pages deployment
        const docsDir = path.resolve('docs');
        fs.rmSync(docsDir, { recursive: true, force: true });
        fs.cpSync(distDir, docsDir, { recursive: true });

        // 2. Sync to /android/app/src/main/assets/public for Capacitor Android APK
        const androidPublicDir = path.resolve('android/app/src/main/assets/public');
        if (fs.existsSync(path.resolve('android/app'))) {
          const cordovaJs = path.join(androidPublicDir, 'cordova.js');
          const cordovaPluginsJs = path.join(androidPublicDir, 'cordova_plugins.js');
          const savedCordova = fs.existsSync(cordovaJs) ? fs.readFileSync(cordovaJs) : null;
          const savedCordovaPlugins = fs.existsSync(cordovaPluginsJs) ? fs.readFileSync(cordovaPluginsJs) : null;

          fs.rmSync(androidPublicDir, { recursive: true, force: true });
          fs.cpSync(distDir, androidPublicDir, { recursive: true });

          if (savedCordova) fs.writeFileSync(cordovaJs, savedCordova);
          if (savedCordovaPlugins) fs.writeFileSync(cordovaPluginsJs, savedCordovaPlugins);
        }
      } catch (err) {
        console.warn('Asset sync warning:', err);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      syncGitHubAndAndroidAssetsPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'WealthTrack Pro',
          short_name: 'WealthTrack',
          description: 'Multi-device personal finance tracker with daily IDR expense tracking, bank-to-cash transfers, direct investment funding, privacy mode, and multi-asset portfolio stats.',
          theme_color: '#090d16',
          background_color: '#090d16',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: './',
          scope: './',
          icons: [
            {
              src: './pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: './pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: './pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api/],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            // 1. Critical Financial API Cache (Accounts, Transactions, Investments, Budgets, Stats)
            {
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'wealthtrack-financial-data-cache',
                networkTimeoutSeconds: 2.5,
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days offline retention
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 2. Exchange Rate & Market Currency Feeds Cache
            {
              urlPattern: /^https:\/\/.*(exchange-rate|currency|exchangerate|frankfurter|coingecko).*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'wealthtrack-rates-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // 3. Web Fonts & Assets
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR WebSocket is disabled in AI Studio environment
      hmr: false,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
