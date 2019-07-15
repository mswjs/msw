const { assert } = require('chai')
const { setWorldConstructor } = require('cucumber')
const servePage = require('../utils/servePage')
const webpackConfig = require('../../webpack.config')

const LIBRARY_NAME = webpackConfig.output.library

const createMockDef = ({ method, route, mockFunc }) => `
const { composeMocks, rest } = ${LIBRARY_NAME};
const { start } = composeMocks(
  rest.${method.toLowerCase()}(${JSON.stringify(route, null, 2)}, ${mockFunc})
);
start()
`

class World {
  async prepare() {
    const { expectedMethod, route, mockFunc } = this
    const mockDef = createMockDef({
      method: expectedMethod,
      route,
      mockFunc,
    })

    // Override the HTML served by the test server
    // to include scenario-relevant mock definition.
    servePage(this.app, {
      mockDef,
    })

    // Go to the scenario page
    await this.gotoScenario()

    // Browser refresh disables the MSW
    // and when next mocking definition is found,
    // the MSW is enabled with the relevant definition.
    await this.page.reload()

    // Assert HTML from the server includes mock definition
    const html = await this.page.content()
    assert.include(html, route)

    // TODO: Assert MSW is running
    // throw new Error('MSW is not confirmed to be running')
  }

  async request(method, url) {
    // Perform the request within the page's context
    // where a running instance of MSW is operating.
    const response = await this.page.evaluate(
      async (method, url) => {
        const res = await fetch(url, {
          method,
        })

        let headers = {}
        for (const pair of res.headers.entries()) {
          headers[pair[0]] = pair[1]
        }

        return {
          headers,
          body: await res.json(),
        }
      },
      method,
      url,
    )

    // Save response in the context to assert in step defs
    this.response = response
  }
}

setWorldConstructor(World)
