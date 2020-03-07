import React from 'react'
import './method.mocks'

export default () => {
  const handlePostButtonClick = () => {
    fetch('https://api.github.com/users/octocat', { method: 'POST' })
  }

  const handleGetButtonClick = () => {
    fetch('https://api.github.com/users/octocat')
  }

  return (
    <div>
      <button data-test-id="button-post" onClick={handlePostButtonClick}>
        Perform a POST request
      </button>
      <button data-test-id="button-get" onClick={handleGetButtonClick}>
        Perform a GET request
      </button>
    </div>
  )
}
