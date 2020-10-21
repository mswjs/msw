import { data } from './data'
import { errors } from './errors'
import { response } from '../response'

test('sets a single data on the response JSON body', () => {
  const result = response(data({ name: 'msw' }))

  expect(result.headers.get('content-type')).toBe('application/json')
  expect(result).toHaveProperty(
    'body',
    JSON.stringify({
      data: {
        name: 'msw',
      },
    }),
  )
})

test('sets multiple data on the response JSON body', () => {
  const result = response(
    data({ name: 'msw' }),
    data({ description: 'API mocking library' }),
  )

  expect(result.headers.get('content-type')).toBe('application/json')
  expect(result).toHaveProperty(
    'body',
    JSON.stringify({
      data: {
        description: 'API mocking library',
        name: 'msw',
      },
    }),
  )
})

test('combines with error in the response JSON body', () => {
  const result = response(
    data({ name: 'msw' }),
    errors([
      {
        message: 'exceeds the limit of awesomeness',
      },
    ]),
  )

  expect(result.headers.get('content-type')).toBe('application/json')
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
