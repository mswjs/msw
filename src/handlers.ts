import * as R from 'ramda'

export const response = (...handlers) => {
  return R.compose(...handlers)({
    status: 200,
    body: null,
  })
}

export const json = (payload: Object) => (res) => {
  return {
    ...res,
    body: JSON.stringify(payload),
  }
}

export const status = (code: number, text: string) => (res) => {
  return {
    ...res,
    status: code,
    statusText: text,
  }
}
