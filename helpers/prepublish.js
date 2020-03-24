const chalk = require('chalk')
const {
  SERVICE_WORKER_SOURCE_PATH,
  SERVICE_WORKER_BUILD_PATH,
} = require('./constants')
const getChecksum = require('./getChecksum')
const compileServiceWorker = require('./compileServiceWorker')
const updateIntegrityManifest = require('./updateIntegrityManifest')

console.log('Preparing Service Worker for publishing...')
console.log(
  'Using Service Worker source at "%s"',
  chalk.cyan(SERVICE_WORKER_SOURCE_PATH),
)

async function prepublish() {
  const checksum = getChecksum(SERVICE_WORKER_SOURCE_PATH)
  await compileServiceWorker(
    SERVICE_WORKER_SOURCE_PATH,
    SERVICE_WORKER_BUILD_PATH,
    checksum,
  )
  updateIntegrityManifest(checksum)
}

prepublish()
