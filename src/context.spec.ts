import context from './context'
import res from './response'

const assertHeader = (
  headers: any,
  expectedName: string,
  expectedValue: string,
) => {
  const entries = Array.from(headers.entries())
  const matchedHeader = entries.filter(([name, value]) => {
    return (
      name.toLowerCase() === expectedName.toLowerCase() &&
      value === expectedValue
    )
  })
  expect(matchedHeader.length).toBeGreaterThan(0)
}

test('set', () => {
  const { headers } = res(context.set('Content-Type', 'image/*'))
  assertHeader(headers, 'Content-Type', 'image/*')
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
  const { body, headers } = res(context.text('Response text'))
  expect(body).toBe('Response text')
  assertHeader(headers, 'Content-Type', 'text/plain')
})

test('xml', () => {
  const { body, headers } = res(context.xml('<message>Response text</message>'))
  expect(body).toEqual('<message>Response text</message>')
  assertHeader(headers, 'Content-Type', 'text/xml')
})

test('json', () => {
  const { body, headers } = res(context.json({ message: 'Response message' }))
  expect(body).toEqual(JSON.stringify({ message: 'Response message' }))
  assertHeader(headers, 'Content-Type', 'application/json')
})

test('delay', () => {
  expect(res(context.delay(1200))).toHaveProperty('delay', 1200)
})
