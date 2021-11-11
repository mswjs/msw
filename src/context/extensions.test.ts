/**
 * @jest-environment jsdom
 */
import { errors } from './errors'
import { data } from './data'
import { extensions } from './extensions'
import { response } from '../response'

test('sets a given extensions on the response JSON body in the presence of no errors or data', async () => {
  const result = await response(extensions({ tracking: { version: 1 } }))

  expect(result.headers.get('content-type')).toEqual('application/json')
  expect(result).toHaveProperty(
    'body',
    JSON.stringify({
      extensions: {
        tracking: {
          version: 1,
        },
      },
    }),
  )
})

test('sets given extensions on the response JSON body in the presence of data', async () => {
  const result = await response(
    data({ hello: 'world' }),
    extensions({ tracking: { version: 1 } }),
  )

  expect(result.headers.get('content-type')).toEqual('application/json')
  expect(result).toHaveProperty(
    'body',
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

test('sets given extensions on the response JSON body in the presence of data and errors', async () => {
  const result = await response(
    data({ hello: 'world' }),
    extensions({ tracking: { version: 1 } }),
    errors([{ message: 'Error message' }]),
  )

  expect(result.headers.get('content-type')).toEqual('application/json')
  expect(result).toHaveProperty(
    'body',
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
