import * as R from 'ramda'
import formatPath from './utils/formatPath'
import msw from './msw'

test('Supports declaring a new route using REST methods', () => {
  const mask = 'https://api.github.com/user/:username'
  const methods = ['get', 'post', 'put', 'patch', 'options', 'delete']

  methods.forEach((methodName) => {
    const resolver = (req, res, { text }) =>
      res(text(`response ${methodName} text`))
    msw[methodName](mask, resolver)
    const storedRoute = R.find(
      R.propEq('mask', formatPath(mask, [])),
      msw.routes[methodName],
    )

    expect(storedRoute).not.toBeUndefined()
    expect(storedRoute.resolver.toString()).toEqual(resolver.toString())
  })
})
