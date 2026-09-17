import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { StatusCodeColor } from '../../../src/core/utils/logging/getStatusCodeColor'
import { defineNetwork, expect } from '../../setup/vitest-helpers'
import { gql } from '../../support/graphql'

interface GetUserDetailQuery {
  user: {
    firstName: string
    lastName: string
  }
}

interface LoginQuery {
  user: {
    id: string
  }
}

const api = graphql.link('*')

const handlers = [
  api.query<GetUserDetailQuery>('GetUserDetail', () => {
    return HttpResponse.json({
      data: {
        user: {
          firstName: 'John',
          lastName: 'Maverick',
        },
      },
    })
  }),
  api.mutation<LoginQuery>('Login', () => {
    return HttpResponse.json({
      data: {
        user: {
          id: 'abc-123',
        },
      },
    })
  }),
  api.operation(() => {
    return HttpResponse.json(
      {
        data: {
          ok: true,
        },
      },
      {
        status: 301,
      },
    )
  }),
]

const test = defineNetwork({ handlers })

test('prints a log for a GraphQL query', async ({
  spyOnConsole,
  query,
  task,
}) => {
  const consoleSpy = spyOnConsole()

  await query('/graphql', {
    query: gql`
      query GetUserDetail {
        user {
          firstName
          lastName
        }
      }
    `,
  })

  if (task.file.projectName === 'browser') {
    await expect
      .poll(() => consoleSpy.get('raw')?.get('startGroupCollapsed'))
      .toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            new RegExp(
              `^\\[MSW\\] \\d{2}:\\d{2}:\\d{2} query GetUserDetail \\(%c200 OK%c\\) color:${StatusCodeColor.Success} color:inherit$`,
            ),
          ),
        ]),
      )
  }
})

test('prints a log for a GraphQL mutation', async ({
  spyOnConsole,
  query,
  task,
}) => {
  const consoleSpy = spyOnConsole()

  await query('/graphql', {
    query: gql`
      mutation Login {
        user {
          id
        }
      }
    `,
  })

  if (task.file.projectName === 'browser') {
    await expect
      .poll(() => consoleSpy.get('raw')?.get('startGroupCollapsed'))
      .toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            new RegExp(
              `\\[MSW\\] \\d{2}:\\d{2}:\\d{2} mutation Login \\(%c200 OK%c\\) color:${StatusCodeColor.Success} color:inherit$`,
            ),
          ),
        ]),
      )
  }
})

test('prints a log for a GraphQL query intercepted via the "operation()" link handler', async ({
  spyOnConsole,
  query,
  task,
}) => {
  const consoleSpy = spyOnConsole()

  await query('/graphql', {
    query: gql`
      query GetLatestPosts {
        posts {
          title
        }
      }
    `,
  })

  if (task.file.projectName === 'browser') {
    await expect
      .poll(() => consoleSpy.get('raw')?.get('startGroupCollapsed'))
      .toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            new RegExp(
              `\\[MSW\\] \\d{2}:\\d{2}:\\d{2} query GetLatestPosts \\(%c301 Moved Permanently%c\\) color:${StatusCodeColor.Warning} color:inherit$`,
            ),
          ),
        ]),
      )
  }
})

test('prints a log for a GraphQL mutation intercepted via the "operation()" link handler', async ({
  spyOnConsole,
  query,
  task,
}) => {
  const consoleSpy = spyOnConsole()

  await query('/graphql', {
    query: gql`
      mutation CreatePost {
        post {
          id
        }
      }
    `,
  })

  if (task.file.projectName === 'browser') {
    await expect
      .poll(() => consoleSpy.get('raw')?.get('startGroupCollapsed'))
      .toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            new RegExp(
              `^\\[MSW\\] \\d{2}:\\d{2}:\\d{2} mutation CreatePost \\(%c301 Moved Permanently%c\\) color:${StatusCodeColor.Warning} color:inherit$`,
            ),
          ),
        ]),
      )
  }
})
