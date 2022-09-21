/**
 * @jest-environment jsdom
 */
import { getAbsoluteWorkerUrl } from './getAbsoluteWorkerUrl'

afterAll(() => {
  Object.defineProperty(window, 'location', {
    value: {
      href: '',
    },
  })
})

it('returns an absolute URL relatively to the root', () => {
  expect(getAbsoluteWorkerUrl('./mockServiceWorker.js')).toEqual(
    'http://localhost/mockServiceWorker.js',
  )
})

it('returns an absolute URL relatively to the current path', () => {
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost/foo/bar/',
    },
  })

  // Must respect the dot in the relative path.
  expect(getAbsoluteWorkerUrl('./worker.js')).toBe(
    'http://localhost/foo/bar/worker.js',
  )

  // Must support the root-level reference
  // regardless of the current location.
  expect(getAbsoluteWorkerUrl('/worker.js')).toBe('http://localhost/worker.js')
})
