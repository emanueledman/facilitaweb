'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';

const RESOURCES = {"flutter.js": "76f08d47ff9f5715220992f993002504",
"assets/AssetManifest.json": "af236ac12b2f46aec036331dff11b999",
"assets/packages/flutter_map/lib/assets/flutter_map_logo.png": "208d63cc917af9713fc9572bd5c09362",
"assets/shaders/ink_sparkle.frag": "ecc85a2e95f5e9f53123dcaf8cb9b6ce",
"assets/FontManifest.json": "7b2a36307916a9721811788013e65289",
"assets/AssetManifest.bin": "028cdb9d815cee3bf5762aedd42eeae8",
"assets/NOTICES": "860c704024048850564f0584c4e179f7",
"assets/AssetManifest.bin.json": "23d5ab055984af9152000a8085800921",
"assets/fonts/MaterialIcons-Regular.otf": "15186d09f5d9d226f0ac07d4f6936472",
"script.js": "06bf26c40a189e3db32d37e638a5161b",
"js/firebaseAuth.js": "1eb42547a363d75be0c08ce63edf620e",
"version.json": "5d094645e984076fd8408788fc8155c7",
"login.html": "50918d80eb6c3ed919a713769f7cfb13",
"404.html": "0a27a4163254fc8fce870c8cc3a3f94f",
"canvaskit/skwasm_st.js": "d1326ceef381ad382ab492ba5d96f04d",
"canvaskit/skwasm.js.symbols": "80806576fa1056b43dd6d0b445b4b6f7",
"canvaskit/skwasm_st.wasm": "56c3973560dfcbf28ce47cebe40f3206",
"canvaskit/skwasm_st.js.symbols": "c7e7aac7cd8b612defd62b43e3050bdd",
"canvaskit/skwasm.wasm": "f0dfd99007f989368db17c9abeed5a49",
"canvaskit/canvaskit.js": "86e461cf471c1640fd2b461ece4589df",
"canvaskit/chromium/canvaskit.js": "34beda9f39eb7d992d46125ca868dc61",
"canvaskit/chromium/canvaskit.js.symbols": "5a23598a2a8efd18ec3b60de5d28af8f",
"canvaskit/chromium/canvaskit.wasm": "64a386c87532ae52ae041d18a32a3635",
"canvaskit/canvaskit.js.symbols": "68eb703b9a609baef8ee0e413b442f33",
"canvaskit/canvaskit.wasm": "efeeba7dcc952dae57870d4df3111fad",
"canvaskit/skwasm.js": "f2ad9363618c5f62e813740099a80e63",
"flutter_bootstrap.js": "4e30cb2a3b4907d0fec8b41f3386e2f9",
"main.dart.js": "2f33a87e2cc36dc9dfd5ff5903d1e95d",
"report.html": "54470158c5daf5b639494c489098b92c",
"manifest.json": "17f830ada29921ed23d6b2deda8731a7",
"favicon.png": "5dcef449791fa27946b3d35ad8803796",
"dashboard.html": "1d57c87de51b82dd0c542020a07346cc",
"new-report.html": "f1c9cb1682ca58e927e2145bc6c17fbc",
"index.html": "6c1e716f14722365001568b2991ba310",
"/": "6c1e716f14722365001568b2991ba310",
"firebase-messaging-sw.js": "9a4206a2b2748050e18722f61a447f07",
"profile.html": "16f22e9acfd4ebf8dd96526ecee36d4d",
"register.html": "2cc06353a3df47810bda56de71bb735d",
"icons/Icon-192.png": "ac9a721a12bbc803b44f645561ecb1e1",
"icons/Icon-maskable-512.png": "301a7604d45b3e739efc881eb04896ea",
"icons/Icon-512.png": "96e752610906ba2a93c65f8abe1645f1",
"icons/Icon-maskable-192.png": "c457ef57daa1d16f64b27b786ec2ea3c",
"styles.css": "2e350a91d64df756009d97b9616a9427",
".git/index": "e7bcd7e820f7e24857ae3b9550dbaf05",
".git/logs/refs/remotes/origin/main": "3503ff18b8d605732469f46773f144ec",
".git/logs/refs/heads/main": "ce1086be8dbce07e634d386c60315050",
".git/logs/HEAD": "870d3f2c5c3b8359d14d3b4e72507b9a",
".git/description": "a0a7c3fff21f2aea3cfa1d0316dd816c",
".git/hooks/pre-receive.sample": "2ad18ec82c20af7b5926ed9cea6aeedd",
".git/hooks/pre-merge-commit.sample": "39cb268e2a85d436b9eb6f47614c3cbc",
".git/hooks/applypatch-msg.sample": "ce562e08d8098926a3862fc6e7905199",
".git/hooks/update.sample": "647ae13c682f7827c22f5fc08a03674e",
".git/hooks/pre-applypatch.sample": "054f9ffb8bfe04a599751cc757226dda",
".git/hooks/push-to-checkout.sample": "c7ab00c7784efeadad3ae9b228d4b4db",
".git/hooks/pre-push.sample": "2c642152299a94e05ea26eae11993b13",
".git/hooks/commit-msg.sample": "579a3c1e12a1e74a98169175fb913012",
".git/hooks/pre-commit.sample": "5029bfab85b1c39281aa9697379ea444",
".git/hooks/fsmonitor-watchman.sample": "a0b2633a2c8e97501610bd3f73da66fc",
".git/hooks/prepare-commit-msg.sample": "2b5c047bdb474555e1787db32b2d2fc5",
".git/hooks/post-update.sample": "2b7ea5cee3c49ff53d41e00785eb974c",
".git/hooks/pre-rebase.sample": "56e45f2bcbc8226d2b4200f7c46371bf",
".git/hooks/sendemail-validate.sample": "4d67df3a8d5c98cb8565c07e42be0b04",
".git/objects/34/539f6e0325c79b6c02ec3fef556892b865ea6f": "425366b13e4d9c44af9cbd86bae95889",
".git/objects/dc/0e5ff8a18fa1fdee1838acf0e68030f3c75e59": "78b1297392a3d5736c29863f47f3fb75",
".git/objects/f3/709a83aedf1f03d6e04459831b12355a9b9ef1": "538d2edfa707ca92ed0b867d6c3903d1",
".git/objects/f3/f24ffc223cd7da11d32f6e3efd1ac0404c881a": "839fe700a8564b723113e9d59ada7ff7",
".git/objects/64/5116c20530a7bd227658a3c51e004a3f0aefab": "f10b5403684ce7848d8165b3d1d5bbbe",
".git/objects/fb/43628970a072550c8b7a8c9ae91e94b5203524": "36239b6079427bb1347e462efca7c87e",
".git/objects/0b/9fcf3d6c6058acc662279d9d22099086a0c78a": "0f20d8b31472ed851f3506e98bb44282",
".git/objects/cf/4ad8c6aeb0dcde06f6f89abe2d95cb97456e1e": "60f02af24ea03ce39a4381513f9a0bca",
".git/objects/86/03d0a3d2a91580f77171968c7d13e73fd1482a": "dc750bd17c929d834d260dd7dc0293e7",
".git/objects/83/afd2f15a96be910d8e04366c2acaeadfd6efb4": "fc087381ec76aad2ae920e50603cb607",
".git/objects/9e/095befb3801959ee3990eb3a399649e9e0f005": "be1acfce75b7ffc24abfcc29c01435b0",
".git/objects/8a/aa46ac1ae21512746f852a42ba87e4165dfdd1": "1d8820d345e38b30de033aa4b5a23e7b",
".git/objects/8a/51a9b155d31c44b148d7e287fc2872e0cafd42": "9f785032380d7569e69b3d17172f64e8",
".git/objects/2b/e167396c6f61a60f35c9fc7934bf404e55689c": "22fbedb800fb9be358893484b54d8df5",
".git/objects/6d/d0ac5e1bc5b5c09392c115ee706f402ee82e91": "4ac40edf543a475426843ea5e8d24826",
".git/objects/88/cfd48dff1169879ba46840804b412fe02fefd6": "e42aaae6a4cbfbc9f6326f1fa9e3380c",
".git/objects/88/2710e149b82a1fdae320b167cb319e8fa6e583": "dea5ae593aad721630b1ea452f70dec9",
".git/objects/a5/de584f4d25ef8aace1c5a0c190c3b31639895b": "9fbbb0db1824af504c56e5d959e1cdff",
".git/objects/4c/1c9bc0def6dfeffce4d8adaaa44286796d2dad": "30609ab711c750070a33536aad445f77",
".git/objects/ab/ab792457927b3dbbe4d6443ab6494c5c78a856": "6f22e85e4be5c687637f420fa1fada97",
".git/objects/cb/3ad71b94292e42d5783afee753958989933901": "f97f1d6fcc1ac366f592f0eec90145ec",
".git/objects/35/96d08a5b8c249a9ff1eb36682aee2a23e61bac": "e931dda039902c600d4ba7d954ff090f",
".git/objects/3a/bf18c41c58c933308c244a875bf383856e103e": "30790d31a35e3622fd7b3849c9bf1894",
".git/objects/40/1184f2840fcfb39ffde5f2f82fe5957c37d6fa": "1ea653b99fd29cd15fcc068857a1dbb2",
".git/objects/c8/828b8fd4030a9c51773b2de58e997c8d8ffad8": "953c614df42c3f82804c14c8dee238f2",
".git/objects/59/47859aa77597d714cad62049cfb6d21e553616": "992cf68c483f60cc19c01bfd47ee7003",
".git/objects/d6/9c56691fbdb0b7efa65097c7cc1edac12a6d3e": "868ce37a3a78b0606713733248a2f579",
".git/objects/26/98c5d40488037029a427e3b66a1389565d309b": "7638feaa37f5226c6568876e793eab9c",
".git/objects/26/961440431a6cafa6f84f52b75fb3588cd4a34e": "ff01522253f7bc8a831ad86c2b3b9e56",
".git/objects/87/643a70b2d7bf0e72425fa69616b2f9088b124d": "17d7d9a82fc7bda83fac0da506fce152",
".git/objects/38/f159e41d326e10799c2b74d4fff4f287f6287e": "77ecb0cc74b149ce955cd28f9cec2692",
".git/objects/4f/02e9875cb698379e68a23ba5d25625e0e2e4bc": "254bc336602c9480c293f5f1c64bb4c7",
".git/objects/03/16435c82b22d5589e3e125e69a91e1c0e5bd9f": "75714099b3f569e03da73ed7eeb8b194",
".git/objects/03/2fe904174b32b7135766696dd37e9a95c1b4fd": "80ba3eb567ab1b2327a13096a62dd17e",
".git/objects/d2/46813172bfbc1f9883163b7872be01582dc6d6": "fa7c265b9b6c9eb30852d96f5a7b3962",
".git/objects/0f/9c9748922a9a1381157897ca864eb299563ba9": "9d3ab650f6ac06394b962fffbbe48aca",
".git/objects/4e/fa30d859eb51a3d304a14f7b2a6c94a6df016d": "f033432a74d93681e629035f03153284",
".git/objects/f2/04823a42f2d890f945f70d88b8e2d921c6ae26": "6b47f314ffc35cf6a1ced3208ecc857d",
".git/objects/eb/9b4d76e525556d5d89141648c724331630325d": "37c0954235cbe27c4d93e74fe9a578ef",
".git/objects/b4/974fc394b1587a03b3b3f425af2ca06aeeb8c1": "7d33b50e127e157c5638db5c937d0d9b",
".git/objects/b4/7f867b106331259c2cd809b3b5a769a3c54631": "10ae20471ea1ebbb053e224bdeac6590",
".git/objects/ba/432edf74bff1158f3299e86f317d949de9f75c": "ef83fae7470619beb7bbc1a041ca9d16",
".git/objects/50/042c2550f437dc708d10e25ee3f6d0734c3a41": "88b94e0fa8f7391db17ce198c7bdd0bb",
".git/objects/5f/bf1f5ee49ba64ffa8e24e19c0231e22add1631": "f19d414bb2afb15ab9eb762fd11311d6",
".git/objects/24/71898fa8e53b54718a8438e357bf1d62ce289a": "cc610e43503c2b1ed0bc9f17ee49acf7",
".git/objects/e6/17b351b874fb7d3750b09d6efd5f787287ebfc": "b041d3d72b53228736cb267cca55f228",
".git/objects/b7/49bfef07473333cf1dd31e9eed89862a5d52aa": "36b4020dca303986cad10924774fb5dc",
".git/objects/21/667da7445e2de54d525d662057a1793ccea659": "2244679d094cf92431f31b0fc1635026",
".git/objects/e0/7797437d096064bd90c373800dcb0f335c14b0": "16f9b9defb16491f8c733b09b022688c",
".git/objects/c9/fbc2c5f4e545a844df3fe87f2c1cbc9efe014f": "555fd293517de2b89af255934823ac9d",
".git/objects/51/886b6a19fa68cc4c57435eb9c5cb95d4013641": "ce888ebc3090a01f14c32b4ee54ad635",
".git/objects/b2/0c54862f3bfb00d17f55f450de9ad03a5669f0": "43366eb4880227ca4a7081848c927ad8",
".git/objects/e1/07d1ac17d633e6669417c0f8ae5721fffc70a2": "4ed64947700951d3ebcdbddefc990b08",
".git/objects/46/3a427fb45b05f263a9f817c145c2731c863a92": "6379757053593e94b0da572eb57258db",
".git/objects/01/2dce206dc68ac976f5fee7a80635176546d979": "6f3018e8ae4f7b15b0b7c62878551afb",
".git/objects/d4/3532a2348cc9c26053ddb5802f0e5d4b8abc05": "3dad9b209346b1723bb2cc68e7e42a44",
".git/objects/1f/e034b5275e0a42e26ad5328ffdfa19f74d53d0": "fb34c5da2e7aa4ed90a266603708510c",
".git/objects/ef/b875788e4094f6091d9caa43e35c77640aaf21": "27e32738aea45acd66b98d36fc9fc9e0",
".git/objects/92/71c91f3b2a3682aed96b2953ed5c0ab6be534e": "28a42fbe301e89d2a97704ad92a47457",
".git/objects/92/a1aed2831011a517294798e352e441ca94ee4e": "6058850044c3357a864f2391f98233b6",
".git/objects/82/9eda8fdcf133ab2083dbc880b6362b11d0c8ea": "72fd972bf7f0020b924435fc702e5219",
".git/objects/67/d4d3b414eb7cb72d23c09bec8051694bc2dc46": "ca46f5616f41af92e5e53b6a88cbd55f",
".git/objects/55/c4dbf087787bee5d02de7b19ef486718ecaa0c": "d6bbb19985f4df8fb14cdce7096a6bf5",
".git/objects/58/114238d67641103868ce542c89235bee042ab6": "55cad1b489df92586513a45323bcf289",
".git/objects/a8/8c9340e408fca6e68e2d6cd8363dccc2bd8642": "11e9d76ebfeb0c92c8dff256819c0796",
".git/objects/8f/e6718f5a31118710673a796df9fcfb4fc0c81a": "441194fb7dff5ca85151bd3f2e7791f1",
".git/objects/85/21e2a0eb7905d9d97c0a63a5bc61f23062d88c": "c87d9d8baa06478c9e1eeac56c90f468",
".git/objects/c3/39d2354c298cda4112fa3e887d67d2eba28c2e": "7ab83bdef1f1e5a08210419fda67064d",
".git/objects/c3/511212f927de7de6d9f4b51fd3717a3570a36c": "04de81437b81a63ba483b7bc3bf446a5",
".git/objects/91/e9a1c4f60059da8e0194387d4962b38fd34e85": "efb4cdb7f08893f684e29c5376a42798",
".git/objects/91/4a40ccb508c126fa995820d01ea15c69bb95f7": "8963a99a625c47f6cd41ba314ebd2488",
".git/objects/7c/b1c8bd7716e35be7db9bd2dd0f865cb510d52f": "45629487454c3a159e3e18fb4135b79e",
".git/objects/33/31d9290f04df89cea3fb794306a371fcca1cd9": "e54527b2478950463abbc6b22442144e",
".git/objects/33/85621d3667ec814e6653dc461d5c5fa9607dad": "5fd8b587bd6176af18fac1fc6b8dd84c",
".git/objects/62/b9c5c32aed52aa0192b19de3625ff2e51286d3": "f00702047d41a2a9b51eb6f8f8cd076f",
".git/objects/d9/3952e90f26e65356f31c60fc394efb26313167": "1401847c6f090e48e83740a00be1c303",
".git/objects/d9/7487a7bc009bcf1396f60af24a528566b79672": "565e70753bd7dea122f9b98a6bec9b97",
".git/objects/b9/2a0d854da9a8f73216c4a0ef07a0f0a44e4373": "f62d1eb7f51165e2a6d2ef1921f976f3",
".git/objects/b9/f7199f41d449b45d0707e7b471eec02c90bb67": "70de62c3236c20776216dd38738aa9eb",
".git/objects/57/7946daf6467a3f0a883583abfb8f1e57c86b54": "846aff8094feabe0db132052fd10f62a",
".git/config": "86085a8a7d8872e29d22dc2e5d1e4f78",
".git/COMMIT_EDITMSG": "39c509698257c8a8c405e794c2f23553",
".git/info/exclude": "036208b4a1ab4a235d75c181e685e5a3",
".git/refs/remotes/origin/main": "2370cf5e380daa3057fbdc490d09d661",
".git/refs/heads/main": "2370cf5e380daa3057fbdc490d09d661",
".git/HEAD": "cf7dd3ce51958c5f13fece957cc417fb"};
// The application shell files that are downloaded before a service worker can
// start.
const CORE = ["main.dart.js",
"index.html",
"flutter_bootstrap.js",
"assets/AssetManifest.bin.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(
        CORE.map((value) => new Request(value, {'cache': 'reload'})));
    })
  );
});
// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');
      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        // Claim client to enable caching on first launch
        self.clients.claim();
        return;
      }
      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      // Claim client to enable caching on first launch
      self.clients.claim();
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});
// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // Redirect URLs to the index.html
  if (key.indexOf('?v=') != -1) {
    key = key.split('?v=')[0];
  }
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#') || key == '') {
    key = '/';
  }
  // If the URL is not the RESOURCE list then return to signal that the
  // browser should take over.
  if (!RESOURCES[key]) {
    return;
  }
  // If the URL is the index.html, perform an online-first request.
  if (key == '/') {
    return onlineFirst(event);
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache only if the resource was successfully fetched.
        return response || fetch(event.request).then((response) => {
          if (response && Boolean(response.ok)) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      })
    })
  );
});
self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'downloadOffline') {
    downloadOffline();
    return;
  }
});
// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey of Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return contentCache.addAll(resources);
}
// Attempt to download the resource online before falling back to
// the offline cache.
function onlineFirst(event) {
  return event.respondWith(
    fetch(event.request).then((response) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch((error) => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response != null) {
            return response;
          }
          throw error;
        });
      });
    })
  );
}
