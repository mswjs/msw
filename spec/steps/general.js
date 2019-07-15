const { assert } = require('chai')
const { Given, When, Then } = require('cucumber')

Given('you mocked {string} request using {string} route', function(
  method,
  route,
) {
  this.expectedMethod = method
  this.route = route
})

Given('the mocking function was:', function(mockFunc) {
  this.mockFunc = mockFunc
})

Given('MockServiceWorker was running', async function() {
  await this.prepare()
})

//

When('performed {string} request to {string}', async function(method, url) {
  await this.request(method, url)
})

//

Then(/^the response MUST( NOT)? be mocked$/, function(isNegative) {
  const mswHeader = this.response.headers['x-powered-by']
  const expectedValue = 'msw'
  const equal = isNegative ? assert.notEqual : assert.equal

  equal(
    mswHeader,
    expectedValue,
    'Failed to assert "X-Powered-By" header of the response',
  )
})

Then('the response field {string} MUST equal:', function(
  propName,
  expectedValue,
) {
  const expectedJson = JSON.parse(expectedValue)
  assert.deepEqual(this.response[propName], expectedJson)
})
