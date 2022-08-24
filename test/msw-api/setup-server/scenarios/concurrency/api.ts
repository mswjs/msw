import fetch from 'node-fetch'

export const makeRequest = async (endpoint: string) => {
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return res
}
