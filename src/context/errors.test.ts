import { errors } from './errors'
import { data } from './data'
import { response } from '../response'

test('sets a given error on the response JSON body', () => {
  const result = response(errors([{ message: 'Error message' }]))

  expect(result.headers.get('content-type')).toEqual('application/json')
  expect(result).toHaveProperty(
    'body',
    JSON.stringify({
      errors: [
        {
          message: 'Error message',
        },
      ],
    }),
  )
})

test('sets given errors on the response JSON body', () => {
  const result = response(
    errors([{ message: 'Error message' }, { message: 'Second error' }]),
  )

  expect(result.headers.get('content-type')).toEqual('application/json')
  expect(result).toHaveProperty(
    'body',
    JSON.stringify({
      errors: [
        {
          message: 'Error message',
        },
        {
          message: 'Second error',
        },
      ],
    }),
  )
})

test('combines with data in the response JSON body', () => {
  const result = response(
    data({ name: 'msw' }),
    errors([{ message: 'exceeds the limit of awesomeness' }]),
  )

  expect(result.headers.get('content-type')).toEqual('application/json')
  expect(result).toHaveProperty(
    'body',
    JSON.stringify({
      errors: [
        {
          message: 'exceeds the limit of awesomeness',
        },
      ],
      data: {
        name: 'msw',
      },
    }),
  )
})
