import * as R from 'ramda'
import msw from './msw'

test('Supports declaring a new route using REST methods', () => {
  const mask = 'https://api.github.com/user/:username'
  const methods = ['get', 'post', 'put', 'patch', 'options', 'delete']

  methods.forEach((methodName) => {
    const resolver = (req, res, { text }) =>
      res(text(`response ${methodName} text`))
    msw[methodName](mask, resolver)

    expect(R.path([methodName, mask], msw.routes)).not.toBeUndefined()
    expect(R.path([methodName, mask], msw.routes).toString()).toEqual(
      resolver.toString(),
    )
  })
})
