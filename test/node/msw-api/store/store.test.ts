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

const server = setupServer(
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

beforeAll(() => {
  server.listen({
    /** @todo */
    // context: {
    // 	store
    // }
  })
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

test('updates an in-memory record', async () => {
  server.use(
    http.put<{ id: string }, Partial<Post>, Post>(
      'https://api.example.com/posts/:id',
      async ({ request, params }) => {
        const posts = store.open('posts')
        const data = await request.json()

        const nextPost = posts.update(
          (post) => {
            return post.id === params.id
          },
          (post) => {
            return {
              ...post,
              ...data,
            }
          },
        )

        return HttpResponse.json(nextPost)
      },
    ),
  )

  await fetch('https://api.example.com/posts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'abc-123', title: 'Hello world' }),
  })

  const updatedPost = await fetch('https://api.example.com/posts/abc-123', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'New title' }),
  }).then((response) => response.json())

  expect(updatedPost).toEqual({
    id: 'abc-123',
    title: 'New title',
  })

  {
    const post = await fetch('https://api.example.com/posts/abc-123').then(
      (response) => response.json(),
    )
    expect(post).toEqual({
      id: 'abc-123',
      title: 'New title',
    })
  }
})
