/**
 * @see https://github.com/mswjs/msw/issues/1823
 */
import type { Path, DefaultBodyType } from 'msw'
import { http, HttpResponse } from 'msw'

it('accepts custom response body generic argument', () => {
  function myHandler<CustomResponseBodyType extends DefaultBodyType>(
    path: Path,
  ) {
    return (response: CustomResponseBodyType) => {
      http.get(path, () => HttpResponse.json(response))
    }
  }
})
