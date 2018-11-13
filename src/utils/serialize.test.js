import serialize from './serialize'

test('Serializes an object with methods', () => {
  const obj = {
    a: 2,
    first: () => 'foo',
    second() {
      return 'bar'
    }
  }

  expect(serialize(obj)).toEqual('{"a":2,first:"() => \'foo\'",second:"function(){return \'bar\'"}')
})
