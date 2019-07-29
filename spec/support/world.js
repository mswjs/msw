const { expect } = require('chai')
const { setWorldConstructor } = require('cucumber')
const webpackConfig = require('../../webpack.config')

const LIBRARY_NAME = webpackConfig.output.library

const createMockDef = ({ method, route, mockFunc }) => `
const { composeMocks, rest } = ${LIBRARY_NAME};
const { start } = composeMocks(
  rest.${method.toLowerCase()}(${JSON.stringify(route, null, 2)}, ${mockFunc})
);
// Delegated start of MSW. Don't do this at home, kids.
window.__MSW_PENDING__ = start;
`

class World {
  async prepare(mockFunc) {
    const { expectedMethod, route } = this

    // Assign mocking definition to be embedded by Express
    // and served within the returned HTML.
    this.mockDef = createMockDef({
      method: expectedMethod,
      route,
      mockFunc,
    })

    // Open the scenario page
    await this.gotoPage()
  }

  async ensureMswRunning() {
    const html = await this.page.content()
    expect(html, 'Page does not contain mock definition').to.include(this.route)

    const state = await this.page.evaluate(async () => {
      return window.__MSW_PENDING__()
    })

    expect(['installing', 'active', 'waiting']).to.include(state)
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
