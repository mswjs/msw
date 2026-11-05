// @vitest-environment node
import { isCommonAssetRequest } from './is-common-asset-request'

test('treats requests over the "file:" protocol as common assets', () => {
  expect(
    isCommonAssetRequest(new Request('file:///Users/me/app/index.js')),
  ).toBe(true)
  expect(isCommonAssetRequest(new Request('file:///Users/me/app/data'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('file:///etc/hosts'))).toBe(true)
})

test('does not treat requests over other protocols as common assets by default', () => {
  expect(isCommonAssetRequest(new Request('http://localhost/api/user'))).toBe(
    false,
  )
  expect(isCommonAssetRequest(new Request('https://localhost/api/user'))).toBe(
    false,
  )
  expect(isCommonAssetRequest(new Request('ftp://localhost/api/user'))).toBe(
    false,
  )
})

test('treats requests to Google Fonts as common assets', () => {
  expect(
    isCommonAssetRequest(
      new Request('https://fonts.googleapis.com/css2?family=Inter'),
    ),
  ).toBe(true)
  expect(
    isCommonAssetRequest(new Request('https://fonts.googleapis.com/')),
  ).toBe(true)
  expect(
    isCommonAssetRequest(new Request('http://fonts.googleapis.com/icon')),
  ).toBe(true)
})

test('does not treat requests to other Google hosts as common assets', () => {
  expect(
    isCommonAssetRequest(new Request('https://www.googleapis.com/oauth2/v1')),
  ).toBe(false)
  expect(
    isCommonAssetRequest(new Request('https://fonts.gstatic.com/resource')),
  ).toBe(false)
})

test('treats requests to node modules served over HTTP as common assets', () => {
  expect(
    isCommonAssetRequest(
      new Request('http://localhost:3000/node_modules/react/index.js'),
    ),
  ).toBe(true)
  expect(
    isCommonAssetRequest(
      new Request('http://localhost:3000/node_modules/.vite/deps/react.js'),
    ),
  ).toBe(true)
  expect(
    isCommonAssetRequest(
      new Request('http://localhost:3000/packages/app/node_modules/lodash'),
    ),
  ).toBe(true)
})

test('does not treat node modules in the hostname as common assets', () => {
  expect(
    isCommonAssetRequest(new Request('http://node_modules.example.com/api')),
  ).toBe(false)
})

test('does not treat node modules in the query as common assets', () => {
  expect(
    isCommonAssetRequest(
      new Request('http://localhost/api?path=node_modules/react'),
    ),
  ).toBe(false)
})

test('treats internal Vite requests as common assets', () => {
  expect(
    isCommonAssetRequest(new Request('http://localhost:5173/@vite/client')),
  ).toBe(true)
  expect(
    isCommonAssetRequest(new Request('http://localhost:5173/@vite/env')),
  ).toBe(true)
  expect(
    isCommonAssetRequest(
      new Request('http://localhost:5173/@vite-plugin-react/preamble'),
    ),
  ).toBe(true)
})

test('does not treat Vite mentions in the query as common assets', () => {
  expect(
    isCommonAssetRequest(new Request('http://localhost/api?source=@vite')),
  ).toBe(false)
})

test('treats stylesheet requests as common assets', () => {
  expect(isCommonAssetRequest(new Request('http://localhost/main.css'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/main.scss'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/main.less'))).toBe(
    true,
  )
})

test('treats script requests as common assets', () => {
  expect(isCommonAssetRequest(new Request('http://localhost/main.js'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/main.mjs'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/main.jsx'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/main.ts'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/main.mts'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/main.tsx'))).toBe(
    true,
  )
})

test('treats HTML document requests as common assets', () => {
  expect(isCommonAssetRequest(new Request('http://localhost/index.html'))).toBe(
    true,
  )
})

test('treats font requests as common assets', () => {
  expect(isCommonAssetRequest(new Request('http://localhost/font.ttf'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/font.otf'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/font.woff'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/font.woff2'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/font.eot'))).toBe(
    true,
  )
})

test('treats image requests as common assets', () => {
  expect(isCommonAssetRequest(new Request('http://localhost/image.gif'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/image.jpg'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/image.jpeg'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/image.png'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/image.avif'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/image.webp'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/image.svg'))).toBe(
    true,
  )
})

test('treats favicon requests as common assets', () => {
  expect(
    isCommonAssetRequest(new Request('http://localhost/favicon.ico')),
  ).toBe(true)
})

test('treats video requests as common assets', () => {
  expect(isCommonAssetRequest(new Request('http://localhost/video.mp4'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/video.webm'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/video.ogg'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/video.mov'))).toBe(
    true,
  )
})

test('treats audio requests as common assets', () => {
  expect(isCommonAssetRequest(new Request('http://localhost/audio.mp3'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/audio.wav'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/audio.flac'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/audio.aac'))).toBe(
    true,
  )
})

test('treats document requests as common assets', () => {
  expect(isCommonAssetRequest(new Request('http://localhost/file.pdf'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/file.txt'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/file.csv'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/file.json'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/file.xml'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/file.md'))).toBe(
    true,
  )
})

test('treats archive requests as common assets', () => {
  expect(
    isCommonAssetRequest(new Request('http://localhost/archive.zip')),
  ).toBe(true)
  expect(
    isCommonAssetRequest(new Request('http://localhost/archive.tar')),
  ).toBe(true)
  expect(isCommonAssetRequest(new Request('http://localhost/archive.gz'))).toBe(
    true,
  )
  expect(
    isCommonAssetRequest(new Request('http://localhost/archive.tar.gz')),
  ).toBe(true)
  expect(
    isCommonAssetRequest(new Request('http://localhost/archive.rar')),
  ).toBe(true)
  expect(isCommonAssetRequest(new Request('http://localhost/archive.7z'))).toBe(
    true,
  )
})

test('matches the asset extension regardless of its case', () => {
  expect(isCommonAssetRequest(new Request('http://localhost/image.PNG'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/main.Js'))).toBe(
    true,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/file.JSON'))).toBe(
    true,
  )
})

test('treats nested asset paths as common assets', () => {
  expect(
    isCommonAssetRequest(
      new Request('http://localhost/static/assets/images/logo.png'),
    ),
  ).toBe(true)
  expect(
    isCommonAssetRequest(new Request('https://cdn.example.com/v1/bundle.js')),
  ).toBe(true)
})

test('ignores the query string when matching the asset extension', () => {
  expect(
    isCommonAssetRequest(new Request('http://localhost/main.js?v=123')),
  ).toBe(true)
  expect(
    isCommonAssetRequest(new Request('http://localhost/image.png?w=100&h=100')),
  ).toBe(true)
})

test('ignores the hash when matching the asset extension', () => {
  expect(
    isCommonAssetRequest(new Request('http://localhost/main.js#section')),
  ).toBe(true)
})

test('does not treat asset-like extensions in the query as common assets', () => {
  expect(
    isCommonAssetRequest(new Request('http://localhost/api?file=image.png')),
  ).toBe(false)
})

test('does not treat asset-like extensions in the hostname as common assets', () => {
  expect(isCommonAssetRequest(new Request('http://example.png/api'))).toBe(
    false,
  )
})

test('does not treat an extension followed by more path as a common asset', () => {
  expect(
    isCommonAssetRequest(new Request('http://localhost/main.js/metadata')),
  ).toBe(false)
  expect(isCommonAssetRequest(new Request('http://localhost/image.png/'))).toBe(
    false,
  )
})

test('does not treat unknown extensions as common assets', () => {
  expect(isCommonAssetRequest(new Request('http://localhost/data.bin'))).toBe(
    false,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/map.wasm'))).toBe(
    false,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/file.docx'))).toBe(
    false,
  )
})

test('does not treat an extension without a leading dot as a common asset', () => {
  expect(isCommonAssetRequest(new Request('http://localhost/png'))).toBe(false)
  expect(isCommonAssetRequest(new Request('http://localhost/api/json'))).toBe(
    false,
  )
})

test('does not treat API requests as common assets', () => {
  expect(isCommonAssetRequest(new Request('http://localhost/api/user'))).toBe(
    false,
  )
  expect(
    isCommonAssetRequest(new Request('https://api.example.com/v1/users/123')),
  ).toBe(false)
  expect(isCommonAssetRequest(new Request('http://localhost/graphql'))).toBe(
    false,
  )
  expect(isCommonAssetRequest(new Request('http://localhost/'))).toBe(false)
})

test('does not treat API requests with dotted segments as common assets', () => {
  expect(
    isCommonAssetRequest(new Request('http://localhost/api/v1.2/users')),
  ).toBe(false)
  expect(
    isCommonAssetRequest(new Request('http://localhost/users/john.doe')),
  ).toBe(false)
})

test('ignores the request method when matching common assets', () => {
  expect(
    isCommonAssetRequest(
      new Request('http://localhost/main.js', { method: 'POST' }),
    ),
  ).toBe(true)
  expect(
    isCommonAssetRequest(
      new Request('http://localhost/api/user', { method: 'GET' }),
    ),
  ).toBe(false)
})
