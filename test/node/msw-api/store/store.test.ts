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
  http.get<never, never, Array<Post>>(
    'https://api.example.com/posts',
    async () => {
      const posts = await store.open('posts')
      const allPosts = await posts.all()
      return HttpResponse.json(allPosts)
    },
  ),
  http.post<never, Post, Post>(
    'https://api.example.com/posts',
    async ({ request }) => {
      const data = await request.json()

      const posts = await store.open('posts')
      await posts.put(data.id, data)

      return HttpResponse.json(data, { status: 201 })
    },
  ),
  http.get<{ id: string }, never, Post>(
    'https://api.example.com/posts/:id',
    async ({ params }) => {
      const posts = await store.open('posts')
      const post = await posts.get(params.id)

      if (!post) {
        return new HttpResponse(null, { status: 404 })
      }

      return HttpResponse.json(post)
    },
  ),
)

beforeAll(() => {
  server.listen()
})

afterEach(async () => {
  await store.clear()
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

test('updates a single matching record', async () => {
  server.use(
    http.put<{ id: string }, Partial<Post>, Post>(
      'https://api.example.com/posts/:id',
      async ({ request, params }) => {
        const posts = await store.open('posts')
        const data = await request.json()

        const nextPost = await posts.update(
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

test('updates multiple matching records', async () => {
  server.use(
    http.get('https://api.example.com/posts/capitalize', async () => {
      const posts = await store.open('posts')
      const updatedPosts = await posts.updateMany(
        (post) => {
          return post.title.includes('Hello')
        },
        (post) => {
          return {
            ...post,
            title: post.title.toUpperCase(),
          }
        },
      )

      return HttpResponse.json(updatedPosts)
    }),
  )

  await Promise.all([
    fetch('https://api.example.com/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'abc-123', title: 'Hello world' }),
    }),
    fetch('https://api.example.com/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'def-456', title: 'Hello cosmos' }),
    }),
  ])

  // Must return all updated posts.
  const updatedPosts = await fetch(
    'https://api.example.com/posts/capitalize',
  ).then((response) => response.json())
  expect(updatedPosts).toEqual([
    { id: 'abc-123', title: 'HELLO WORLD' },
    { id: 'def-456', title: 'HELLO COSMOS' },
  ])

  // Must actually update the posts.
  const allPosts = await fetch('https://api.example.com/posts').then(
    (response) => response.json(),
  )
  expect(allPosts).toEqual([
    { id: 'abc-123', title: 'HELLO WORLD' },
    { id: 'def-456', title: 'HELLO COSMOS' },
  ])
})

test('deletes a single matching record by its key', async () => {
  server.use(
    http.delete<{ id: string }>(
      'https://api.example.com/posts/:id',
      async ({ params }) => {
        const posts = await store.open('posts')
        const deletedPost = await posts.delete(params.id)
        return HttpResponse.json(deletedPost)
      },
    ),
  )

  await fetch('https://api.example.com/posts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'abc-123', title: 'Hello world' }),
  })

  // Must return the deleted post.
  const deletedPost = await fetch('https://api.example.com/posts/abc-123', {
    method: 'DELETE',
  }).then((response) => response.json())
  expect(deletedPost).toEqual({ id: 'abc-123', title: 'Hello world' })

  // Must actually delete the post.
  const allPosts = await fetch('https://api.example.com/posts').then(
    (response) => response.json(),
  )
  expect(allPosts).toEqual([])
})

test('deletes a single matching record', async () => {
  server.use(
    http.delete<{ id: string }>(
      'https://api.example.com/posts/delete-by-name',
      async ({ params }) => {
        const posts = await store.open('posts')
        const deletedPost = await posts.deleteFirst((post) => {
          return post.title.includes('Hello')
        })
        return HttpResponse.json(deletedPost)
      },
    ),
  )

  await Promise.all([
    fetch('https://api.example.com/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'abc-123', title: 'Hello world' }),
    }),
    fetch('https://api.example.com/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'def-456', title: 'Another post' }),
    }),
  ])

  // Must return the deleted post.
  const deletedPost = await fetch(
    'https://api.example.com/posts/delete-by-name',
    { method: 'DELETE' },
  ).then((response) => response.json())
  expect(deletedPost).toEqual({
    id: 'abc-123',
    title: 'Hello world',
  })

  // Must actually delete the post.
  const allPosts = await fetch('https://api.example.com/posts').then(
    (response) => response.json(),
  )
  expect(allPosts).toEqual([{ id: 'def-456', title: 'Another post' }])
})

test('deletes all matching records', async () => {
  server.use(
    http.delete<{ id: string }>(
      'https://api.example.com/posts/delete-by-name',
      async ({ params }) => {
        const posts = await store.open('posts')
        const deletedPost = await posts.deleteMany((post) => {
          return post.title.includes('Hello')
        })
        return HttpResponse.json(deletedPost)
      },
    ),
  )

  await Promise.all([
    fetch('https://api.example.com/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'abc-123', title: 'Hello world' }),
    }),
    fetch('https://api.example.com/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'def-456', title: 'Hello cosmos' }),
    }),
  ])

  // Must return the deleted posts.
  const deletedPosts = await fetch(
    'https://api.example.com/posts/delete-by-name',
    { method: 'DELETE' },
  ).then((response) => response.json())
  expect(deletedPosts).toEqual([
    { id: 'abc-123', title: 'Hello world' },
    { id: 'def-456', title: 'Hello cosmos' },
  ])

  // Must actually delete all the posts.
  const allPosts = await fetch('https://api.example.com/posts').then(
    (response) => response.json(),
  )
  expect(allPosts).toEqual([])
})
