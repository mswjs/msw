import { http } from '../http'
import { graphql } from '../graphql'
import { ws } from '../ws'
import { InMemoryHandlersController } from './handlers-controller'

describe(InMemoryHandlersController.prototype.use, () => {
  it('prepends a handler to an empty controller', () => {
    const controller = new InMemoryHandlersController([])
    const httpHandler = http.get('/', () => {})
    controller.use([httpHandler])

    expect(controller.currentHandlers).toEqual([httpHandler])
    expect(controller.getHandlersByKind('request')).toEqual([httpHandler])
  })

  it('prepends a single handler', () => {
    const httpOne = http.get('/', () => {})
    const httpTwo = http.get('/', () => {})

    const controller = new InMemoryHandlersController([httpOne])
    controller.use([httpTwo])

    expect(controller.currentHandlers).toEqual([httpTwo, httpOne])
    expect(controller.getHandlersByKind('request')).toEqual([httpTwo, httpOne])
  })

  it('prepends multiple handlers', () => {
    const httpOne = http.get('/', () => {})
    const httpTwo = http.get('/', () => {})
    const httpThree = http.get('/', () => {})

    const controller = new InMemoryHandlersController([httpOne])

    controller.use([httpTwo, httpThree])

    expect(controller.currentHandlers).toEqual([httpTwo, httpThree, httpOne])
    expect(controller.getHandlersByKind('request')).toEqual([
      httpTwo,
      httpThree,
      httpOne,
    ])
  })

  it('preserves order of handlers', () => {
    const httpOne = http.get('/', () => {})
    const graphqlOne = graphql.query('', () => {})
    const httpTwo = http.get('/', () => {})

    const controller = new InMemoryHandlersController([httpOne])
    controller.use([graphqlOne, httpTwo])

    expect(controller.currentHandlers).toEqual([graphqlOne, httpTwo, httpOne])
  })
})

describe(InMemoryHandlersController.prototype.reset, () => {
  it('resets to the initial handlers if called with an empty list', () => {
    {
      const controller = new InMemoryHandlersController([])
      controller.reset([])
      expect(controller.currentHandlers).toEqual([])
    }

    {
      const httpHandler = http.get('/', () => {})
      const controller = new InMemoryHandlersController([httpHandler])
      controller.reset([])
      expect(controller.currentHandlers).toEqual([httpHandler])
    }
  })

  it('replaces the initial handlers if called with a list of handlers', () => {
    const httpOne = http.get('/', () => {})
    const httpTwo = http.get('/', () => {})
    const controller = new InMemoryHandlersController([httpOne])
    controller.reset([httpTwo])
    expect(controller.currentHandlers).toEqual([httpTwo])
  })
})

describe(InMemoryHandlersController.prototype.getHandlersByKind, () => {
  it('returns an empty array given an empty controller', () => {
    const controller = new InMemoryHandlersController([])
    expect(controller.getHandlersByKind('request')).toEqual([])
  })

  it('returns an empty array given no handlers by the given kind', () => {
    expect(
      new InMemoryHandlersController([
        http.get('/', () => {}),
        graphql.query('', () => {}),
      ]).getHandlersByKind('websocket'),
    ).toEqual([])

    expect(
      new InMemoryHandlersController([
        ws.link('*').addEventListener('connection', () => {}),
      ]).getHandlersByKind('request'),
    ).toEqual([])
  })

  it('returns all handlers if they all match', () => {
    const httpHandler = http.get('/', () => {})
    const graphqlHandler = graphql.query('', () => {})
    const wsHandler = ws.link('*').addEventListener('connection', () => {})

    expect(
      new InMemoryHandlersController([
        httpHandler,
        graphqlHandler,
      ]).getHandlersByKind('request'),
    ).toEqual([httpHandler, graphqlHandler])

    expect(
      new InMemoryHandlersController([wsHandler]).getHandlersByKind(
        'websocket',
      ),
    ).toEqual([wsHandler])
  })

  it('returns only the matching handlers', () => {
    const httpHandler = http.get('/', () => {})
    const graphqlHandler = graphql.query('', () => {})
    const wsHandler = ws.link('*').addEventListener('connection', () => {})

    expect(
      new InMemoryHandlersController([
        httpHandler,
        graphqlHandler,
        wsHandler,
      ]).getHandlersByKind('request'),
    ).toEqual([httpHandler, graphqlHandler])

    expect(
      new InMemoryHandlersController([
        httpHandler,
        graphqlHandler,
        wsHandler,
      ]).getHandlersByKind('websocket'),
    ).toEqual([wsHandler])
  })

  it('preserves the order of returned handlers', () => {
    const httpOne = http.get('/', () => {})
    const httpTwo = http.get('/', () => {})
    const httpThree = http.get('/', () => {})

    expect(
      new InMemoryHandlersController([
        httpOne,
        httpTwo,
        httpThree,
      ]).getHandlersByKind('request'),
    ).toEqual([httpOne, httpTwo, httpThree])

    const graphqlOne = graphql.query('', () => {})
    const graphqlTwo = graphql.query('', () => {})
    const graphqlThree = graphql.query('', () => {})

    expect(
      new InMemoryHandlersController([
        graphqlOne,
        graphqlTwo,
        graphqlThree,
      ]).getHandlersByKind('request'),
    ).toEqual([graphqlOne, graphqlTwo, graphqlThree])

    const wsOne = ws.link('*').addEventListener('connection', () => {})
    const wsTwo = ws.link('*').addEventListener('connection', () => {})
    const wsThree = ws.link('*').addEventListener('connection', () => {})

    expect(
      new InMemoryHandlersController([wsOne, wsTwo, wsThree]).getHandlersByKind(
        'websocket',
      ),
    ).toEqual([wsOne, wsTwo, wsThree])
  })
})
