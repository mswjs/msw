import { spawnServer } from './support/spawnServer'

const mockDefs = process.argv[2]

if (!mockDefs.endsWith('.mocks.ts')) {
  throw new Error(`\
The mock definition file you provide doesn't seem to be a valid mock definition:
${mockDefs}

Please make sure you provide the "*.mocks.ts" file to this command.\
`)
}

spawnServer(mockDefs)
