const CACHE_NAME = 'hdat-cache-v2'; // Tăng version để xóa cache cũ của người dùng
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Bỏ qua các request gọi API POST hoặc khác GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        // Chiến lược "Network First, fallback to Cache"
        // Luôn ưu tiên tải file code mới nhất từ trên mạng về
        fetch(event.request)
            .then(response => {
                // Nếu tải thành công, lưu một bản copy vào cache để dùng khi mất mạng
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Nếu mất mạng (offline), tiến hành lấy file từ cache đã lưu
                return caches.match(event.request).then(response => {
                    // Fallback trả về index.html nếu không tìm thấy file
                    return response || caches.match('./index.html');
                });
            })
    );
});

// Lắng nghe thông báo đẩy từ Server
self.addEventListener('push', event => {
    let data = { title: 'Hệ thống báo cáo', body: 'Bạn có thông báo mới!' };
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: './icon-192.png',
        badge: './icon-192.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || './index.html'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Xử lý khi nhấn vào thông báo
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
