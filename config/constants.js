const path = require('path')
const packageJson = require('../package.json')

const SERVICE_WORKER_SOURCE_PATH = path.resolve(
  process.cwd(),
  'src/mockServiceWorker.js',
)

const SERVICE_WORKER_BUILD_PATH = path.resolve(
  process.cwd(),
  path.dirname(packageJson.main),
  path.basename(SERVICE_WORKER_SOURCE_PATH),
)

module.exports = {
  SERVICE_WORKER_SOURCE_PATH,
  SERVICE_WORKER_BUILD_PATH,
}
