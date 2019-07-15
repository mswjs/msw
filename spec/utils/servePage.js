const getHtml = require('./getHtml')
const packageJson = require('../../package.json')

module.exports = function servePage(app, { mockDef }) {
  app.get('/', (_, res) => {
    res.send(
      getHtml({
        libPath: packageJson.main,
        mockDef,
      }),
    )
  })

  return app
}
