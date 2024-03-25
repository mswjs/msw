import { it } from 'vitest'
import { http, HttpResponse } from 'msw'

it('supports generator function as response resolver', () => {
  http.get<never, never, { value: number }>('/', function* () {
    yield HttpResponse.json({ value: 1 })
    yield HttpResponse.json({ value: 2 })
    return HttpResponse.json({ value: 3 })
  })

  http.get<never, never, { value: string }>('/', function* () {
    yield HttpResponse.json({ value: 'one' })
    yield HttpResponse.json({
      // @ts-expect-error Expected string, got number.
      value: 2,
    })
    return HttpResponse.json({ value: 'three' })
  })
})

it('supports async generator function as response resolver', () => {
  http.get<never, never, { value: number }>('/', async function* () {
    yield HttpResponse.json({ value: 1 })
    yield HttpResponse.json({ value: 2 })
    return HttpResponse.json({ value: 3 })
  })

  http.get<never, never, { value: string }>('/', async function* () {
    yield HttpResponse.json({ value: 'one' })
    yield HttpResponse.json({
      // @ts-expect-error Expected string, got number.
      value: 2,
    })
    return HttpResponse.json({ value: 'three' })
  })
})
