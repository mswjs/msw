export function isValidBatchedGraphQLRequest(body: any): boolean {
  if (!Array.isArray(body)) {
    return false
  }

  return isArrayOfGraphQLRequests(body)
}
export function isArrayOfGraphQLRequests(body: any[]): boolean {
  return body.every((value) => {
    return (
      Object.prototype.hasOwnProperty.call(value, 'operationName') &&
      Object.prototype.hasOwnProperty.call(value, 'query')
    )
  })
}
