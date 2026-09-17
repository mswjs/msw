import { http, HttpResponse } from 'msw'
import * as JSONbig from 'json-bigint'
import * as JSONBig from 'json-bigint'
import { defineNetwork, expect } from '../../../setup/vitest-helpers'

const handlers = [
  http.get('*/user', () => {
    return new HttpResponse(
      JSONbig.stringify({
        username: 'john.maverick',
        balance: BigInt(1597928668063727616),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }),
]

const test = defineNetwork({ handlers })

test('uses a custom transformer to parse BigInt in response body', async ({
  fetch,
}) => {
  const res = await fetch('/user')
  const body = await res.text()

  expect(body).toEqual(
    JSONBig.stringify({
      username: 'john.maverick',
      balance: BigInt(1597928668063727616),
    }),
  )
})
