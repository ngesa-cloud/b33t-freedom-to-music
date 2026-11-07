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
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "1d7d6ecc4402564e805a360e86afc398"
  }, {
    "url": "pwa-512x512.png",
    "revision": "c03a5d515b60f566f023630de0aad5a6"
  }, {
    "url": "pwa-192x192.png",
    "revision": "16778b59a6c9c1472c3e4aaeab41ea2c"
  }, {
    "url": "logo.png",
    "revision": "83b10f8492774a4c578ae44512f473b0"
  }, {
    "url": "index.html",
    "revision": "e7db002a183c0f91f916efdf005445d4"
  }, {
    "url": "icon.svg",
    "revision": "9fd2652bd94a07b9c572e78b9bab0356"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "e6695a9bb30cff68ce4f0c7ee3c77465"
  }, {
    "url": "assets/web-DcH9YtYw.js",
    "revision": null
  }, {
    "url": "assets/web-BvNbUv6A.js",
    "revision": null
  }, {
    "url": "assets/index-CUQI9WVW.css",
    "revision": null
  }, {
    "url": "assets/index-BoQcsAH1.js",
    "revision": null
  }, {
    "url": "assets/aistudio/image_f44a429b.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_e7e38259.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_cc6e5255.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_c78e7eb3.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_c35896d7.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_b8390358.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_98535ff7.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_91a2c960.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_8a19a932.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_87e19c01.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_8506fe1d.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_81059094.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_7b6d5f55.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_38828de3.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_1c66960a.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_11147868.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_09b67b05.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_01933a26.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261107-152803_d1889e79.png",
    "revision": null
  }, {
    "url": "assets/aistudio/Screenshot_20261106-213718_f5ea49e5.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "e6695a9bb30cff68ce4f0c7ee3c77465"
  }, {
    "url": "icon.svg",
    "revision": "9fd2652bd94a07b9c572e78b9bab0356"
  }, {
    "url": "logo.png",
    "revision": "83b10f8492774a4c578ae44512f473b0"
  }, {
    "url": "pwa-192x192.png",
    "revision": "16778b59a6c9c1472c3e4aaeab41ea2c"
  }, {
    "url": "pwa-512x512.png",
    "revision": "c03a5d515b60f566f023630de0aad5a6"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "1d7d6ecc4402564e805a360e86afc398"
  }, {
    "url": "manifest.webmanifest",
    "revision": "ef899c3c6a6c8e8d193d3af5d87d69d0"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api\//]
  }));
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
  workbox.registerRoute(/^https:\/\/i\.ytimg\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "yt-thumbnails-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
