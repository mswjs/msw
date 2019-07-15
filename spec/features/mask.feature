Feature: Mask route

  Background:
    Given you mocked "POST" request using "https://api.github.com/users/:username" route
    And the mocking function was:
      """
      (req, res, ({ json }) => {
      const { username } = req.params
      return res(json({ username }))
      })
      """
    And MockServiceWorker was running

  Scenario: Matching string
    When performed "POST" request to "https://api.github.com/users/admin"
    Then the response MUST be mocked
    And the response field "body" MUST equal:
      """
      {
        "username": "admin"
      }
      """
