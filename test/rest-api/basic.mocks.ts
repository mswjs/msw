import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://api.github.com/users/:username', ({ params }) => {
    const { username } = params

    return new Response(
      JSON.stringify({
        name: 'John Maverick',
        originalUsername: username,
      }),
    )

    // return res(
    //   ctx.json({
    //     name: 'John Maverick',
    //     originalUsername: username,
    //   }),
    // )
  }),
)

worker.start()

// @ts-ignore
window.worker = worker
