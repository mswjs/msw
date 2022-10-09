const fetch = require('node-fetch')

if (typeof window !== 'undefined') {
  globalThis.Request = fetch.Request

  // Provide "Headers" to be accessible in test cases
  // since they are not, by default.
  Object.defineProperty(window, 'Headers', {
    writable: true,
    value: fetch.Headers,
  })

  Object.defineProperty(navigator || {}, 'serviceWorker', {
    writable: false,
    value: {
      addEventListener: () => null,
    },
  })
}
