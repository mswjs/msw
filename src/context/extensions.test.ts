/**
 * @jest-environment jsdom
 */
import { errors } from './errors'
import { data } from './data'
import { extensions } from './extensions'
import { response } from '../response'

test('sets standalone extensions on the response JSON body', async () => {
  const result = await response(extensions({ tracking: { version: 1 } }))

  expect(result.headers.get('content-type')).toEqual('application/json')
  expect(result.body).toEqual(
    JSON.stringify({
      extensions: {
        tracking: {
          version: 1,
        },
      },
    }),
  )
})

test('sets given extensions on the response JSON body with data', async () => {
  const result = await response(
    data({ hello: 'world' }),
    extensions({ tracking: { version: 1 } }),
  )

  expect(result.headers.get('content-type')).toEqual('application/json')
  expect(result.body).toEqual(
    JSON.stringify({
      extensions: {
        tracking: {
          version: 1,
        },
      },
      data: {
        hello: 'world',
      },
    }),
  )
})

test('sets given extensions on the response JSON body in the presence with data and errors', async () => {
  const result = await response(
    data({ hello: 'world' }),
    extensions({ tracking: { version: 1 } }),
    errors([{ message: 'Error message' }]),
  )

  expect(result.headers.get('content-type')).toEqual('application/json')
  expect(result.body).toEqual(
    JSON.stringify({
      errors: [
        {
          message: 'Error message',
        },
      ],
      extensions: {
        tracking: {
          version: 1,
        },
      },
      data: {
        hello: 'world',
      },
    }),
  )
})
