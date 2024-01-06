const urlCache = new Map<string, URL>()

export function urlFromRequestOrCache(request: Request): URL {
  const requestUrl = request.url
  let url = urlCache.get(requestUrl)
  if (!url) {
    url = new URL(requestUrl)
    urlCache.set(requestUrl, url)
  }
  return url
}
