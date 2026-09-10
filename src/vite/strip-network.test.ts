import { parseAst } from 'vite'
import { stripNetwork as transformNetwork } from './strip-network'

function stripNetwork(code: string, id: string) {
  return transformNetwork(code, id, parseAst(code))
}

it('removes network setup and its otherwise unused dependencies', () => {
  const result = stripNetwork(
    `
import { network } from 'virtual:msw'
import { handlers } from './handlers'
const initialHandlers = handlers
network.configure({ handlers: initialHandlers })
await network.enable()
network.events.on('request:start', () => console.log('mock event'))
console.log('app')
`,
    'entry.js',
  )

  expect(result?.code.trim()).toBe("console.log('app')")
  expect(result?.map).toBeDefined()
})

it('follows network aliases while preserving shadowed variables', () => {
  const result = stripNetwork(
    `
import { network as mocking } from 'virtual:msw'
const network = mocking
const { enable } = network
await enable()
function start(network) {
  return network.enable()
}
console.log(start({ enable() { return 'app' } }))
`,
    'entry.js',
  )

  expect(result?.code).not.toContain('virtual:msw')
  expect(result?.code).not.toContain('mocking')
  expect(result?.code).not.toContain('await')
  expect(result?.code).toContain('return network.enable()')
  expect(result?.code).toContain("return 'app'")
})

it('preserves independently used imports and explicit side effects', () => {
  const result = stripNetwork(
    `
import * as msw from 'virtual:msw'
import { handlers, value } from './handlers'
import './side-effect'
msw.network.configure({ handlers })
await msw.network.enable()
console.log(value)
`,
    'entry.js',
  )

  expect(result?.code).not.toContain('virtual:msw')
  expect(result?.code).toContain("import { value } from './handlers'")
  expect(result?.code).toContain("import './side-effect'")
  expect(result?.code).toContain('console.log(value)')
})

it('preserves other declarations when removing mock-only declarators', () => {
  const result = stripNetwork(
    `
import { network } from 'virtual:msw'
import { handlers } from './handlers'
const before = 1, first = handlers, second = handlers, middle = 2, last = handlers
network.configure({ handlers: [...first, ...second, ...last] })
console.log(before, middle)
`,
    'entry.js',
  )

  expect(result.code).toContain('const before = 1, middle = 2')
  expect(result.code).not.toContain('handlers')
  expect(() => parseAst(result.code)).not.toThrow()
})

it('preserves default imports when all named imports become unused', () => {
  const result = stripNetwork(
    `
import { network } from 'virtual:msw'
import app, { handlers, createHandler } from './shared'
network.configure({ handlers })
network.use(createHandler())
console.log(app)
`,
    'entry.js',
  )

  expect(result.code).toContain("import app from './shared'")
  expect(result.code).not.toContain('handlers')
  expect(result.code).not.toContain('createHandler')
  expect(() => parseAst(result.code)).not.toThrow()
})

it('removes optional calls and network exports while preserving application exports', () => {
  const result = stripNetwork(
    `
import { network } from 'virtual:msw'
const value = 'app'
network?.enable?.()
export { network, value }
`,
    'entry.js',
  )

  expect(result.code).not.toContain('network')
  expect(result.code).toContain('export { value }')
  expect(() => parseAst(result.code)).not.toThrow()
})

it('preserves conditional control flow around removed network calls', () => {
  const result = stripNetwork(
    `
import { network } from 'virtual:msw'
if (globalThis.enabled) network.enable()
else console.log('disabled')
console.log('app')
`,
    'entry.js',
  )

  expect(result.code).not.toContain('network')
  expect(result.code).toContain("else console.log('disabled')")
  expect(() => parseAst(result.code)).not.toThrow()
})

it('preserves dependencies used outside mocking, including assignments and exports', () => {
  const result = stripNetwork(
    `
import { network } from 'virtual:msw'
import { handlers } from './handlers'
let configuredHandlers = handlers
network.configure({ handlers: configuredHandlers })
configuredHandlers = []
export { configuredHandlers }
`,
    'entry.js',
  )

  expect(result.code).not.toContain('virtual:msw')
  expect(result.code).toContain("import { handlers } from './handlers'")
  expect(result.code).toContain('configuredHandlers = []')
  expect(result.code).toContain('export { configuredHandlers }')
})

it('preserves network bindings local to named class expressions', () => {
  const result = stripNetwork(
    `
import { network } from 'virtual:msw'
network.enable()
const Local = class network {
  static create() { return new network() }
}
console.log(Local.create())
`,
    'entry.js',
  )

  expect(result.code).not.toContain('virtual:msw')
  expect(result.code).toContain('return new network()')
  expect(() => parseAst(result.code)).not.toThrow()
})
