/**
 * Determines if the given request is a static asset request.
 * Useful when deciding which unhandled requests to ignore.
 *
 * @example
 * import { isAssetRequest } from 'msw'
 *
 * await worker.start({
 *   onUnhandledRequest(request, print) {
 *     if (!isAssetRequest(request)) {
 *       print.warning()
 *     }
 *   }
 * })
 */
export function isAssetRequest(request: Request): boolean {
  const url = new URL(request.url)

  // Ignore static assets hosts.
  if (/(fonts\.googleapis\.com)/.test(url.hostname)) {
    return true
  }

  // Ignore node modules served over HTTP.
  if (/node_modules/.test(url.pathname)) {
    return true
  }

  // Ignore common static assets.
  return /\.(css|m?js|m?ts|html|ttf|otf|woff|woff2|gif|jpe?g|png|avif|webp|svg)$/i.test(
    url.pathname,
  )
}
