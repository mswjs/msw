const path = require('path')

const SERVICE_WORKER_SOURCE_PATH = path.resolve(
  __dirname,
  '../src/mockServiceWorker.js',
)

const SERVICE_WORKER_BUILD_PATH = path.resolve(
  __dirname,
  '../lib',
  path.basename(SERVICE_WORKER_SOURCE_PATH),
)

module.exports = {
  SERVICE_WORKER_SOURCE_PATH,
  SERVICE_WORKER_BUILD_PATH,
}
