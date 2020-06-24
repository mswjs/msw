export interface MSWEventListener {
  type: string
  handler: ServiceWorkerContainer | Window
  /* eslint-disable */
  listener: any
}
