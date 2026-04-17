export class FetchRequest extends Request {
  static isMethodWithBody(method: string): boolean {
    return method !== 'HEAD' && method !== 'GET'
  }

  static isConfigurableMode(mode: RequestMode): boolean {
    return mode !== 'navigate'
  }

  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const safeMode =
      init?.mode == null
        ? undefined
        : FetchRequest.isConfigurableMode(init?.mode)
          ? init?.mode
          : 'cors'

    const safeBody = FetchRequest.isMethodWithBody(init?.method || 'GET')
      ? init?.body
      : undefined

    super(input, {
      ...(init || {}),
      mode: safeMode,
      body: safeBody,
    })

    if (init?.mode !== safeMode) {
      Object.defineProperty(this, 'mode', {
        value: init?.mode,
        enumerable: true,
        writable: false,
      })
    }
  }
}
