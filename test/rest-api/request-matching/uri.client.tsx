import React from 'react'
import './uri.mocks'

export default () => {
  return (
    <div>
      <button
        data-test-id="button-exact"
        onClick={() => fetch('https://api.github.com/made-up')}
      >
        Request GitHub
      </button>
      <button
        data-test-id="button-mask"
        onClick={() => fetch('https://test.msw.io/messages/abc-123')}
      >
        Request msw.io
      </button>
      <button
        data-test-id="button-regexp"
        onClick={() => fetch('https://msw.google.com/path')}
      >
        Request Google
      </button>
    </div>
  )
}
