/**
 * @see https://github.com/mswjs/msw/issues/1823
 */
import { http, Path, HttpResponse, DefaultBodyType } from 'msw'
import { it, describe } from 'vitest'

describe('response body type regression', () => {
  it('accepts custom response body type without type error', () => {
    function myHandler<CustomResponseBodyType extends DefaultBodyType>(
      path: Path,
    ) {
      return (response: CustomResponseBodyType) => {
        http.get(path, () => HttpResponse.json(response))
      }
    }
  })
})
