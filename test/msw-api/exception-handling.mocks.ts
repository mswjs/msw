import { composeMocks, rest } from 'msw'

const { start } = composeMocks(
  rest.get('https://api.github.com/users/:username', () => {
    // @ts-ignore
    nonExisting()
    return null
  }),
)

start()
