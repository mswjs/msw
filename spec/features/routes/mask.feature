Feature: Mask route
  Using a mask as a mocking route.

  Background:
    Given I mocked a "GET" request using "https://api.github.com/users/:username" route
    And the mocking function was:
      """
      (req, res, { json }) => {
      const { username } = req.params
      return res(json({ username }))
      }
      """
    And MockServiceWorker was running

  Scenario: Matching URL
    When performed a "GET" request to "https://api.github.com/users/octocat"
    Then the response is mocked
    And the response field "body" equals:
      """
      {
        "username": "octocat"
      }
      """

  Scenario: Matching URL with a non-matching method
    When performed a "POST" request to "https://api.github.com/users/octocat"
    Then the response is NOT mocked

  Scenario: Non-matching URL
    When performed a "GET" request to "https://api.github.com/settings"
    Then the response is NOT mocked
