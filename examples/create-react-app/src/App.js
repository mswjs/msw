import React, { Component } from 'react'
import './App.css'

class App extends Component {
  state = {
    isLoading: false,
    username: '',
    data: null,
  }

  handleUsernameChange = (event) => {
    this.setState({ username: event.target.value })
  }

  handleButtonClick = () => {
    const { username } = this.state

    this.setState({ isLoading: true })

    fetch(`https://api.github.com/users/${username}`)
      .then((res) => res.json())
      .then((data) => this.setState({ data }))
      .then(() => this.setState({ isLoading: false }))
  }

  render() {
    const { isLoading, data } = this.state

    return (
      <div className="App">
        <header className="App-header">
          <input name="username" onChange={this.handleUsernameChange} />
          <button onClick={this.handleButtonClick}>Fetch GitHub user</button>

          {isLoading && <p>Loading...</p>}

          {data && (
            <>
              <img src={data.avatar_url} alt={data.name} width="250" />
              <h2>{data.name}</h2>
              <p>
                <strong>Login:</strong> {data.login}
              </p>
              <p>
                <strong>Repositories:</strong> {data.public_repos}
              </p>
            </>
          )}
        </header>
      </div>
    )
  }
}

export default App
