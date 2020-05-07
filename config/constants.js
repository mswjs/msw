const path = require('path')
const packageJson = require('../package.json')

const SERVICE_WORKER_SOURCE_PATH = path.resolve(
  __dirname,
  '../',
  'src/mockServiceWorker.js',
)

const SERVICE_WORKER_BUILD_PATH = path.resolve(
  __dirname,
  '../',
  path.dirname(packageJson.module),
  path.basename(SERVICE_WORKER_SOURCE_PATH),
)

module.exports = {
  SERVICE_WORKER_SOURCE_PATH,
  SERVICE_WORKER_BUILD_PATH,
}
