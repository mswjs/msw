import { set } from './set'
import { response } from '../response'

test('sets a single header', async () => {
  const { headers } = await response(set('Content-Type', 'image/*'))
  expect(headers.get('content-type')).toEqual('image/*')
})

test('sets a single header with multiple values', async () => {
  const { headers } = await response(
    set({
      Accept: ['application/json', 'image/png'],
    }),
  )

  expect(headers.get('accept')).toEqual('application/json, image/png')
})

test('sets multiple headers', async () => {
  const { headers } = await response(
    set({
      Accept: '*/*',
      'Accept-Language': 'en',
      'Content-Type': 'application/json',
    }),
  )

  expect(headers.get('accept')).toEqual('*/*')
  expect(headers.get('accept-language')).toEqual('en')
  expect(headers.get('content-type')).toEqual('application/json')
})
