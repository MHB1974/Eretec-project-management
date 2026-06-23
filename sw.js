// ERETEC 일정관리 - Service Worker
const CACHE_NAME = "eretec-v1.0.0";
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

// 요청 처리: 정적 파일은 캐시 우선, 그 외(Firebase/외부 API)는 네트워크 우선
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Firebase, Google API, CDN 등은 항상 네트워크로
  if (url.origin !== location.origin) return;
  
  // 같은 도메인의 정적 파일은 캐시 우선
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // 성공한 응답은 캐시에 저장
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => caches.match("./index.html"));  // 오프라인이면 홈 페이지 반환
    })
  );
});
