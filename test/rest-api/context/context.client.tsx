import React from 'react'
import './context.mocks'

export default () => {
  const handleButtonClick = () => {
    fetch('https://test.msw.io/')
  }

  return <button onClick={handleButtonClick}>Fetch</button>
}
