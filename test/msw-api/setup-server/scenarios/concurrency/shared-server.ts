import { setupServer } from 'msw/node'

export const sharedServer = setupServer()

export const sleepDelay = 3000
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const getNow = () => {
  const today = new Date()
  const time =
    today.getHours() +
    ':' +
    today.getMinutes() +
    ':' +
    today.getSeconds() +
    ':' +
    today.getMilliseconds()

  return time
}

export const endpoint = 'https://test.mswjs.io/book'

export let beforeAllResolve

export const beforeAllPromise = new Promise((resolve) => {
  beforeAllResolve = resolve
})

// beforeAll(() => {
//   console.log('before all triggering')
//   sharedServer.listen()
// })

// // do not invoke resetHandlers
// // afterEach(() => {
// //   server.resetHandlers()
// // })

// afterAll(() => {
//   console.log('after all triggering')
//   sharedServer.close()
// })
