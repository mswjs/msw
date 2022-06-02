/**
 * @jest-environment jsdom
 */
import { field } from './field'
import { response } from '../response'
import { data } from './data'
import { errors } from './errors'

test('sets a given field value string on the response JSON body', async () => {
  const result = await response(field('field', 'value'))

  expect(result.headers.get('content-type')).toBe('application/json')
  expect(result).toHaveProperty('body', JSON.stringify({ field: 'value' }))
})

test('sets a given field value object on the response JSON body', async () => {
  const result = await response(
    field('metadata', {
      date: new Date('2022-05-27'),
      comment: 'nice metadata',
    }),
  )

  expect(result.headers.get('content-type')).toBe('application/json')
  expect(result).toHaveProperty(
    'body',
    JSON.stringify({
      metadata: { date: new Date('2022-05-27'), comment: 'nice metadata' },
    }),
  )
})

test('combines with data, errors and other field in the response JSON body', async () => {
  const result = await response(
    data({ name: 'msw' }),
    errors([{ message: 'exceeds the limit of awesomeness' }]),
    field('field', { errorCode: 'value' }),
    field('field2', 123),
  )

  expect(result.headers.get('content-type')).toEqual('application/json')
  expect(result).toHaveProperty(
    'body',
    JSON.stringify({
      field2: 123,
      field: { errorCode: 'value' },
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

test('throws when trying to set non-serializable values', async () => {
  await expect(response(field('metadata', BigInt(1)))).rejects.toThrow(
    'Do not know how to serialize a BigInt',
  )
})

test('throws when passing an empty string as field name', async () => {
  await expect(response(field('' as string, 'value'))).rejects.toThrow(
    `[MSW] Failed to set a custom field on a GraphQL response: field name cannot be empty.`,
  )
})
test('throws when passing an empty string (when trimmed) as field name', async () => {
  await expect(response(field('   ' as string, 'value'))).rejects.toThrow(
    `[MSW] Failed to set a custom field on a GraphQL response: field name cannot be empty.`,
  )
})

test.each(['data', 'errors', 'extensions'])(
  'throws when passing "%s" as field name',
  async (fieldName) => {
    await expect(response(field(fieldName, 'value'))).rejects.toThrow(
      `[MSW] Failed to set a custom "${fieldName}" field on a mocked GraphQL response: forbidden field name. Did you mean to call "ctx.${fieldName}()" instead?`,
    )
  },
)
