import { http, defineStore, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'
import { z } from 'zod'

const store = defineStore({
  collections: {
    posts: z.object({
      id: z.string(),
      title: z.string(),
    }),
  },
})

const worker = setupWorker(
  http.get('/posts', async () => {
    const posts = await store.open('posts')
    return HttpResponse.json(await posts.all())
  }),
  http.get<{ id: string }>('/posts/:id', async ({ params }) => {
    const posts = await store.open('posts')
    const post = await posts.get(params.id)

    if (!post) {
      return new HttpResponse(null, { status: 404 })
    }

    return HttpResponse.json(post)
  }),
  http.post<never, { id: string; title: string }>(
    '/posts',
    async ({ request }) => {
      const data = await request.json()
      const posts = await store.open('posts')
      await posts.put(data.id, data)
      return HttpResponse.json(data, { status: 201 })
    },
  ),
  http.put<{ id: string }, { id: string; title: string }>(
    '/posts/:id',
    async ({ request, params }) => {
      const data = await request.json()
      const posts = await store.open('posts')
      const updatedPost = await posts.update(
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

      return HttpResponse.json(updatedPost)
    },
  ),
  http.delete<{ id: string }>('/posts/:id', async ({ params }) => {
    const posts = await store.open('posts')
    const deletedPost = await posts.delete(params.id)

    if (!deletedPost) {
      return new HttpResponse(null, { status: 404 })
    }

    return HttpResponse.json(deletedPost)
  }),
)

worker.start()
