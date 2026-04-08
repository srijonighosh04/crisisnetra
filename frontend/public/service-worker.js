// service-worker.js - PWA Offline Support for CrisisNetra
// Allows volunteers to work offline and sync when connection returns

const CACHE_NAME = 'rescuenet-v4-cache';
const RUNTIME_CACHE = 'rescuenet-runtime';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Pre-caching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // App shell - cache first, network fallback
  event.respondWith(cacheFirstStrategy(request));
});

// Cache-first strategy (for app shell)
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // If offline and not cached, return offline page
    if (request.mode === 'navigate') {
      return cache.match('/offline.html');
    }
    throw error;
  }
}

// Network-first strategy (for API calls)
async function networkFirstStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // If offline, return cached data
    const cached = await cache.match(request);
    if (cached) {
      console.log('[ServiceWorker] Serving cached API response:', request.url);
      return cached;
    }
    
    // No cached data available
    return new Response(
      JSON.stringify({ 
        error: 'offline', 
        message: 'No network connection and no cached data available' 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Background sync - queue failed requests
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncPendingTasks());
  }
  
  if (event.tag === 'sync-obstacles') {
    event.waitUntil(syncPendingObstacles());
  }
});

// Sync pending task updates
async function syncPendingTasks() {
  try {
    const db = await openDB();
    const pendingTasks = await db.getAll('pending-tasks');
    
    for (const task of pendingTasks) {
      try {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task.data)
        });
        
        // Remove from pending queue on success
        await db.delete('pending-tasks', task.id);
      } catch (error) {
        console.error('Failed to sync task:', error);
      }
    }
  } catch (error) {
    console.error('Sync tasks failed:', error);
  }
}

// Sync pending obstacle reports
async function syncPendingObstacles() {
  try {
    const db = await openDB();
    const pendingObstacles = await db.getAll('pending-obstacles');
    
    for (const obstacle of pendingObstacles) {
      try {
        await fetch('/api/routes/obstacles/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(obstacle.data)
        });
        
        await db.delete('pending-obstacles', obstacle.id);
      } catch (error) {
        console.error('Failed to sync obstacle:', error);
      }
    }
  } catch (error) {
    console.error('Sync obstacles failed:', error);
  }
}

// IndexedDB helper for offline storage
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CrisisNetraDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending-tasks')) {
        db.createObjectStore('pending-tasks', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('pending-obstacles')) {
        db.createObjectStore('pending-obstacles', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('offline-map-tiles')) {
        db.createObjectStore('offline-map-tiles', { keyPath: 'tileUrl' });
      }
    };
  });
}
