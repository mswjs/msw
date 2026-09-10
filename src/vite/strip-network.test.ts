import { stripNetwork } from './strip-network'

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

  expect(result?.code).toBe("console.log('app');")
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
