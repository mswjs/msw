import context from './context'
import res from './response'

test('set', () => {
  expect(res(context.set('Content-Type', 'image/*')).headers).toHaveProperty(
    'Content-Type',
    'image/*',
  )
})

test('status', () => {
  expect(res(context.status(301))).toMatchObject({
    status: 301,
    statusText: 'OK',
  })
  expect(res(context.status(301, 'Custom text'))).toMatchObject({
    status: 301,
    statusText: 'Custom text',
  })
})

test('body', () => {
  expect(res(context.body('Response body'))).toHaveProperty(
    'body',
    'Response body',
  )
})

test('text', () => {
  expect(res(context.text('Response text'))).toMatchObject({
    body: 'Response text',
    headers: {
      'Content-Type': 'text/plain',
    },
  })
})

test('xml', () => {
  expect(res(context.xml('<message>Response text</message>'))).toMatchObject({
    body: '<message>Response text</message>',
    headers: {
      'Content-Type': 'text/xml',
    },
  })
})

test('json', () => {
  expect(res(context.json({ message: 'Response message' }))).toMatchObject({
    body: JSON.stringify({ message: 'Response message' }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
})

test('delay', () => {
  expect(res(context.delay(1200))).toHaveProperty('delay', 1200)
})
