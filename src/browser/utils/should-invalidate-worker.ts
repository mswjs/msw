import type { ServiceWorkerSourceOptions } from '../sources/service-worker-source'

export function shouldInvalidateWorker(
  prevOptions: ServiceWorkerSourceOptions,
  nextOptions: ServiceWorkerSourceOptions,
): boolean {
  return (
    JSON.stringify(prevOptions.lazy) !== JSON.stringify(nextOptions.lazy) ||
    prevOptions.findWorker !== nextOptions.findWorker ||
    prevOptions.serviceWorker.url !== nextOptions.serviceWorker.url ||
    JSON.stringify(prevOptions.serviceWorker.options) !==
      JSON.stringify(nextOptions.serviceWorker.options)
  )
}
