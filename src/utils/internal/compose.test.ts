import { compose } from './compose'

test('executes a list of given functions from right to left', () => {
  const list: number[] = []

  const populateList = compose(
    () => list.push(1),
    () => list.push(7),
    () => list.push(5),
  )
  populateList()

  expect(list).toEqual([5, 7, 1])
})
