const { assert } = require('chai')
const { Given, When, Then } = require('cucumber')

Given('I mocked a {string} request using {string} route', function(
  method,
  route,
) {
  this.expectedMethod = method
  this.route = route
})

Given('the mocking function was:', async function(mockFunc) {
  await this.prepare(mockFunc)
})

Given('MockServiceWorker was running', async function() {
  await this.ensureMswRunning()
})

//

When('performed a {string} request to {string}', async function(method, url) {
  await this.request(method, url)
})

//

Then(/^the response is( NOT)? mocked$/, function(isNegative) {
  const mswHeader = this.response.headers['x-powered-by']
  const expectedValue = 'msw'
  const equal = isNegative ? assert.notEqual : assert.equal

  equal(
    mswHeader,
    expectedValue,
    'Failed to assert "X-Powered-By" header of the response',
  )
})

function assertResponseProp(propName, expectedValue) {
  const expectedJson = JSON.parse(expectedValue)
  assert.deepEqual(this.response[propName], expectedJson)
}

Then('the response field {string} equals:', assertResponseProp)
Then('the response field {string} equals {string}', assertResponseProp)
