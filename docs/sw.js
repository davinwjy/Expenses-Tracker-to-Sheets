/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-13942bd7'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "e188d821623ef71ecdb362c8e64c5a1f"
  }, {
    "url": "pwa-512x512.png",
    "revision": "889f9ee553d47b9e26322513b6b6893a"
  }, {
    "url": "pwa-192x192.png",
    "revision": "00bb69f2f14c03fd4c1d746a0ffcfdf3"
  }, {
    "url": "index.html",
    "revision": "d8b730d6e0b027101fefbd2bd69396e9"
  }, {
    "url": "icon.svg",
    "revision": "5623d5193c83dc630138a85b24e6ff40"
  }, {
    "url": "favicon.ico",
    "revision": "96af9a207c1c3bf2164b11c1aed22e15"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "1d9677e3d33863db7dd19591330a3108"
  }, {
    "url": "404.html",
    "revision": "bc9cc1d4e90457b03f088397d10986fe"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/web-BUsU44O5.js",
    "revision": null
  }, {
    "url": "assets/index-DOz7LDKV.css",
    "revision": null
  }, {
    "url": "assets/index-CILRVYw3.js",
    "revision": null
  }, {
    "url": "assets/aistudio/image_ff7783a6.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_f7cca1cf.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_ede9b51e.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_cf15afce.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_c215de95.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_8de6dc26.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_84a2b204.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_6f719fe3.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_6c8d6082.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_653ddf13.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_530c1d19.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_3fc397ee.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_307bbb88.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_1c7befeb.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_0247bb97.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_2026-11-10_at_11.57.13_7ebb6dad.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_2026-11-10_at_10.36.02_6a6c41be.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_2026-11-02_at_18.29.35_c0bf52f9.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_2026-11-02_at_18.29.26_e3a3cf4d.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_2026-11-02_at_18.22.47_73656757.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_2026-11-02_at_18.10.57_ec6d3578.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_2026-11-02_at_17.28.53_3c36558a.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_2026-11-02_at_17.20.26_9bef21d6.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_2026-11-02_at_17.12.54_d5e84d4d.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "1d9677e3d33863db7dd19591330a3108"
  }, {
    "url": "favicon.ico",
    "revision": "96af9a207c1c3bf2164b11c1aed22e15"
  }, {
    "url": "icon.svg",
    "revision": "5623d5193c83dc630138a85b24e6ff40"
  }, {
    "url": "pwa-192x192.png",
    "revision": "00bb69f2f14c03fd4c1d746a0ffcfdf3"
  }, {
    "url": "pwa-512x512.png",
    "revision": "889f9ee553d47b9e26322513b6b6893a"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "e188d821623ef71ecdb362c8e64c5a1f"
  }, {
    "url": "manifest.webmanifest",
    "revision": "30f77b1e3c825d8d0c6088eee80b4ecf"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api/]
  }));
  workbox.registerRoute(/\/api\/.*/i, new workbox.NetworkFirst({
    "cacheName": "wealthtrack-financial-data-cache",
    "networkTimeoutSeconds": 2.5,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/.*(exchange-rate|currency|exchangerate|frankfurter|coingecko).*/i, new workbox.StaleWhileRevalidate({
    "cacheName": "wealthtrack-rates-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 604800
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
