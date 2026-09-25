importScripts('/mockServiceWorker.js')

self.addEventListener('install', (event) => {
  event.waitUntil(
    new Promise((resolve) => {
      // Emulate long worker installation.
      setTimeout(resolve, 500)
    }),
  )
})
