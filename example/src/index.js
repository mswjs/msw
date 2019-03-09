import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'

/**
 * Please prefer conditionally including a mocking file via bundler
 * during the build of your application.
 */
if (process.env.NODE_ENV === 'development') {
  require('./mocks')
}

ReactDOM.render(<App />, document.getElementById('root'))
