Feature: Status code

  Background:
    Given I mocked a "POST" request using "https://api.github.com" route
    And the mocking function was:
      """
      (req, res, { status }) => {
      return res(status(304))
      }
      """
    And MockServiceWorker was running

  Scenario: Matching URL
    When performed a "POST" request to "https://api.github.com"
    Then the response is mocked
    And the response field "statusCode" equals "304"

  Scenario: Non-matching URL
    When performed a "POST" request to "https://api.github.com/users/octocat"
    Then the response is NOT mocked
