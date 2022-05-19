import { defaultContext } from 'msw'

const { set } = defaultContext

set('header', 'value')
set({
  one: 'value',
  two: 'value',
})

// @ts-expect-error Forbidden response header.
set('cookie', 'secret')
// @ts-expect-error Forbidden response header.
set('Cookie', 'secret')
// @ts-expect-error Forbidden response header.
set('cookie2', 'secret')
// @ts-expect-error Forbidden response header.
set('Cookie2', 'secret')
// @ts-expect-error Forbidden response header.
set('set-cookie', 'secret')
// @ts-expect-error Forbidden response header.
set('Set-Cookie', 'secret')
// @ts-expect-error Forbidden response header.
set('set-cookie2', 'secret')
// @ts-expect-error Forbidden response header.
set('Set-Cookie2', 'secret')

// @ts-expect-error Forbidden response header.
set({ cookie: 'secret' })
// @ts-expect-error Forbidden response header.
set({ Cookie: 'secret' })
// @ts-expect-error Forbidden response header.
set({ cookie2: 'secret' })
// @ts-expect-error Forbidden response header.
set({ Cookie2: 'secret' })
// @ts-expect-error Forbidden response header.
set({ 'set-cookie': 'secret' })
// @ts-expect-error Forbidden response header.
set({ 'Set-Cookie': 'secret' })
// @ts-expect-error Forbidden response header.
set({ 'set-cookie2': 'secret' })
// @ts-expect-error Forbidden response header.
set({ 'Set-Cookie2': 'secret' })
