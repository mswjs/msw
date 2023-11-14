import * as fs from 'fs'
import * as path from 'path'
import { spawnSync } from 'child_process'
import { invariant } from 'outvariant'
import * as tsPackageJson from 'typescript/package.json'

const tsInstalledVersion = tsPackageJson.version
invariant(
  tsInstalledVersion,
  'Failed to run typings tests: unable to determine TypeScript version',
)

const tsVersionMajorMinor = tsInstalledVersion.substring(
  0,
  tsInstalledVersion.lastIndexOf('.'),
)

const tsConfigPaths = [
  path.resolve(__dirname, `tsconfig.${tsVersionMajorMinor}.json`),
  path.resolve(__dirname, 'tsconfig.json'),
]
const tsConfigPath = tsConfigPaths.find((path) => fs.existsSync(path)) as string

console.log('Using tsconfig at "%s"', tsConfigPath)

const { status } = spawnSync('tsc', ['-p', tsConfigPath], {
  cwd: path.resolve(__dirname, '../..'),
  stdio: 'inherit',
})

process.exit(status || 0)
