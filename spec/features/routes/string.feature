Feature: String route
  Using string literal as a mocking route.

  Background:
    Given I mocked a "GET" request using "https://api.github.com/users/octocat" route
    And the mocking function was:
      """
      (req, res, { json }) => {
      return res(json({ firstName: 'Mocked cat' }))
      }
      """
    And MockServiceWorker was running

  Scenario: Matching URL
    When performed a "GET" request to "https://api.github.com/users/octocat"
    Then the response is mocked
    And the response field "body" equals:
      """
      {
        "firstName": "Mocked cat"
      }
      """

  Scenario: Matching URL but non-matching method
    When performed a "POST" request to "https://api.github.com/users/octocat"
    Then the response is NOT mocked

  Scenario: Non-matching URL
    When performed a "GET" request to "https://api.github.com/users/open-draft"
    Then the response is NOT mocked
