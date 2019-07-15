Feature: String route
  Using string literal for a mocking definition.

  Background:
    Given you mocked "GET" request using "https://api.github.com/users/octocat" route
    And the mocking function was:
      """
      (req, res, { json }) => {
      return res(
      json({ first_name: 'Absolutely mocked' })
      )
      }
      """
    And MockServiceWorker was running

  Scenario: Mocks response of a matching request
    When performed "GET" request to "https://api.github.com/users/octocat"
    Then the response MUST be mocked
    And the response field "body" MUST equal:
      """
      {
        "first_name": "Absolutely mocked"
      }
      """

  Scenario: Bypasses non-matching request
    When performed "GET" request to "https://api.github.com/users/open-draft"
    Then the response MUST NOT be mocked
