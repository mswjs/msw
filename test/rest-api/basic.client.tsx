import React, { useState } from 'react'
import './basic.mocks'

const Basic = () => {
  const [data, setData] = useState()

  const handleButtonClick = () => {
    fetch('https://api.github.com/users/octocat')
      .then((res) => res.json())
      .then(setData)
  }

  return (
    <div>
      <button onClick={handleButtonClick}>Fetch</button>
      {data && <h2 data-test-id="username">{data.name}</h2>}
    </div>
  )
}

export default Basic
