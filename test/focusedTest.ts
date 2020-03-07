import * as chalk from 'chalk'
import { spawnServer } from './support/spawnServer'

const mockDefs = process.argv[2]

spawnServer(mockDefs)
