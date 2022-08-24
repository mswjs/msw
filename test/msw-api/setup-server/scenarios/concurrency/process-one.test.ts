import { rest, graphql } from 'msw'
import { setupServer } from 'msw/node'
import { makeRequest } from './api'
import {
  sharedServer,
  sleep,
  endpoint,
  getNow,
  beforeAllResolve,
  beforeAllPromise,
  sleepDelay,
} from './shared-server'

describe('concurrency test', () => {
  beforeAll(async () => {
    sharedServer.listen()
    beforeAllResolve()
  })

  afterAll(async () => {
    sharedServer.close()
  })

  it.concurrent('process one tests', async () => {
    await beforeAllPromise

    const mockFn = jest.fn()

    console.log('step 1 - process one attach handler to server: '),
      sharedServer.use(
        rest.get(`${endpoint}/:processId`, (req, res, ctx) => {
          console.log(
            'step 4 - process one handler resolver triggered: ',
            getNow(),
          )

          mockFn(req.params.processId)

          return res(
            ctx.json({
              text: 'process one handler resolver response',
            }),
          )
        }),
      )

    const handlers = sharedServer.listHandlers()

    await sleep(sleepDelay)

    console.log('step 3 - process one make request: ')

    await makeRequest(`${endpoint}/one`)

    expect(mockFn).toHaveBeenCalledWith('one')

    console.log('process one end: ', handlers)
  })

  it.concurrent('process two tests', async () => {
    await beforeAllPromise

    const mockFn = jest.fn()

    console.log('step 2 - process two attach handler to server: '),
      sharedServer.use(
        rest.get(`${endpoint}/:processId`, (req, res, ctx) => {
          console.log(
            'step 6 - process two handler resolver triggered: ',
            req.params.processId,
          )

          mockFn(req.params.processId)

          return res(
            ctx.json({
              text: 'process two handler resolver response',
            }),
          )
        }),
      )
    await sleep(sleepDelay)

    console.log('step 5 - process two make request: ')

    await makeRequest(`${endpoint}/two`)
    expect(mockFn).toHaveBeenCalledWith('two')
  })
})
