const express = require('express')
const puppeteer = require('puppeteer')
const { BeforeAll, Before, AfterAll } = require('cucumber')

let server
let app
let browser
let page
let gotoScenario

BeforeAll(async function() {
  // Create a testing server
  app = express()
  app.use(express.static(process.cwd()))

  const HOST = '127.0.0.1'
  const PORT = 8090

  return new Promise((resolve) => {
    server = app.listen(PORT, HOST, async () => {
      // Launch Chromium and navigate to the test server
      browser = await puppeteer.launch({
        headless: false,
      })
      page = await browser.newPage()
      gotoScenario = () => page.goto(`http://${HOST}:${PORT}`)

      // Indicate that server and browser are ready
      return resolve()
    })
  })
})

AfterAll(async function() {
  server.close()
  await browser.close()
})

Before(async function() {
  this.server = server
  this.app = app
  this.browser = browser
  this.page = page
  this.gotoScenario = gotoScenario

  this.app.get('/', (_, res) => res.send('Reseting the page...'))
})
