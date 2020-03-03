export const assertHeader = (
  headers: any,
  expectedName: string,
  expectedValue: string,
) => {
  const entries = Array.from(headers.entries())
  const matchedHeader = entries.filter(([name, value]) => {
    return (
      name.toLowerCase() === expectedName.toLowerCase() &&
      value === expectedValue
    )
  })
  expect(matchedHeader.length).toBeGreaterThan(0)
}
