import { http, HttpResponse, defineStore } from 'msw'
import { setupServer } from 'msw/node'
import { z } from 'zod'

const store = defineStore({
  collections: {
    posts: z.object({
      id: z.string(),
      title: z.string(),
    }),
  },
})

const server = setupServer({
  context: {
    store,
  },
})

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

interface Post {
  id: string
  title: string
}

test('persists data between handlers', async () => {
  server.use(
    http.post<never, Post, Post>(
      'https://api.example.com/posts',
      async ({ request }) => {
        const data = await request.json()

        const posts = store.open('posts')
        await posts.put(data.id, data)

        return HttpResponse.json(data, { status: 201 })
      },
    ),
    http.get<{ id: string }, never, Post>(
      'https://api.example.com/posts/:id',
      async ({ params }) => {
        const posts = store.open('posts')
        const post = posts.get(params.id)

        if (!post) {
          return new HttpResponse(null, { status: 404 })
        }

        return HttpResponse.json(post)
      },
    ),
  )

  // Create a new post.
  await fetch('https://api.example.com/posts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'abc-123', title: 'Hello world' }),
  })

  // Retrieve the created post.
  const post = await fetch('https://api.example.com/posts/abc-123').then(
    (response) => response.json(),
  )
  expect(post).toEqual({ id: 'abc-123', title: 'Hello world' })

  await expect(
    fetch('https://api.example.com/posts/123'),
  ).resolves.toMatchObject({ status: 404 })
})
