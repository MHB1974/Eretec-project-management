// ERETEC 일정관리 - Service Worker
const CACHE_NAME = "eretec-v1.0.1";  // 버전 업: 옛 캐시 자동 삭제
const CACHE_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/logo-mark.png",
  "./icons/favicon-64.png"
];

// 설치: 캐시에 정적 파일 저장
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_FILES))
  );
  self.skipWaiting();
});

// 활성화: 오래된 캐시 정리
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 요청 처리:
// - HTML/이미지: 네트워크 우선 (Network First) - 최신 버전 항상 보여줌
// - JS/CSS/manifest: 캐시 우선 (Cache First) - 빠른 로딩
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Firebase, Google API, CDN 등은 항상 네트워크로 (우리 도메인 외)
  if (url.origin !== location.origin) return;
  
  const isHTML = event.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === "/" || url.pathname.endsWith("/");
  const isImage = /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname);
  
  if (isHTML || isImage) {
    // 네트워크 우선 - 최신 파일을 우선시
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // 오프라인이면 캐시에서 가져옴
        return caches.match(event.request).then(cached => cached || caches.match("./index.html"));
      })
    );
  } else {
    // 그 외 (JS, JSON 등) 캐시 우선
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
