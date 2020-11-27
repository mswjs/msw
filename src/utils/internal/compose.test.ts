import { compose } from './compose'

test('composes given functions from right to left', () => {
  const list: number[] = []
  const populateList = compose(
    () => list.push(1),
    () => list.push(7),
    () => list.push(5),
  )

  populateList()

  expect(list).toEqual([5, 7, 1])
})

test('composes a list of async functions from right to left', async () => {
  const generateNumber = compose(
    async (n: number) => n + 1,
    async (n: number) => n * 5,
  )
  const number = await generateNumber(5)

  expect(number).toEqual(26)
})
