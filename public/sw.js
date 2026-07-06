// This service worker exists only to satisfy PWA installability checks
// (some browsers require a registered SW with a fetch handler before
// showing an install prompt). It intentionally caches nothing and never
// calls respondWith() - every request falls through to the network exactly
// as if no service worker were installed.
//
// Per the Phase 3 spec, offline transaction queuing/sync is explicitly out
// of scope. The only offline-resilience feature is form-draft persistence
// via localStorage (see lib/hooks/useFormDraft.ts), which needs no service
// worker at all.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Deliberate no-op pass-through - see file header.
})
