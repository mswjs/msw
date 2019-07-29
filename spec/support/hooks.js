const express = require('express')
const puppeteer = require('puppeteer')
const { Before, After } = require('cucumber')
const getHtml = require('../utils/getHtml')
const packageJson = require('../../package.json')

const HOST = '127.0.0.1'
const PORT = 8090

const spawnServer = (app, port, host) => {
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(port, host, () => {
        resolve(server)
      })
    } catch (error) {
      reject(error)
    }
  })
}

Before(async function() {
  // Prepare server
  const app = express()
  app.use(express.static(process.cwd()))
  app.get('/', (_, res) => {
    res.send(
      getHtml({
        libPath: packageJson.main,
        mockDef: this.mockDef,
      }),
    )
  })

  const server = await spawnServer(app, PORT, HOST)

  // Prepare client
  const browser = await puppeteer.launch({
    headless: false,
  })
  const page = await browser.newPage()
  this.loadScenario = () => page.goto(`http://${HOST}:${PORT}`)

  // References
  this.app = app
  this.server = server
  this.browser = browser
  this.page = page
})

After(async function() {
  await this.browser.close()
  this.server.close()
})
