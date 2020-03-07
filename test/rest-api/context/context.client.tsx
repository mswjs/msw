import React from 'react'
import './context.mocks'

const ContextUtils = () => {
  const handleButtonClick = () => {
    fetch('https://test.msw.io/')
  }

  return <button onClick={handleButtonClick}>Fetch</button>
}

export default ContextUtils
