import { setupWorker, graphql } from 'msw'
// import { createGraphQLClient, gql } from '../../support/graphql'

interface GetUserQuery {
  user: {
    firstName: string
    lastName: string
  }
}

const worker = setupWorker(
  graphql.query<GetUserQuery>('GetUser', async (req, res, ctx) => {
    const originalResponse = await ctx.fetch(req)
    const originalJson = await originalResponse.json()

    return res(
      ctx.data({
        user: {
          firstName: 'Christian',
          lastName: originalJson.data?.user?.lastName,
        },
      }),
      ctx.errors(originalJson.errors),
    )
  }),
)

// @ts-ignore
window.msw = {
  registration: worker.start(),
}

// @ts-ignore
// window.dispatchGraphQLQuery = (uri: string) => {
//   const client = createGraphQLClient({ uri })

//   return client({
//     query: gql`
//       query GetUser {
//         user {
//           firstName
//           lastName
//         }
//       }
//     `,
//   })
// }
