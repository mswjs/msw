const { assert } = require('chai')
const { setWorldConstructor } = require('cucumber')
const webpackConfig = require('../../webpack.config')

const LIBRARY_NAME = webpackConfig.output.library

const createMockDef = ({ method, route, mockFunc }) => `
const { composeMocks, rest } = ${LIBRARY_NAME};
const { start } = composeMocks(
  rest.${method.toLowerCase()}(${JSON.stringify(route, null, 2)}, ${mockFunc})
);
start();
`

class World {
  async prepare(mockFunc) {
    const { expectedMethod, route } = this
    this.mockFunc = mockFunc

    this.mockDef = createMockDef({
      method: expectedMethod,
      route,
      mockFunc,
    })

    // Browser refresh disables the MSW
    // and when next mocking definition is found,
    // the MSW is enabled with the relevant definition.
    await this.loadScenario()

    // Assert that page HTML includes the mock definition
    const html = await this.page.content()
    assert.include(html, route)
  }

  async ensureMswRunning() {
    /**
     * @todo Await MSW "start" promise to be resolved.
     */
    return true
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

    // Store response for further assertions
    this.response = response
  }
}

setWorldConstructor(World)
