/**
 * @see https://github.com/mswjs/msw/issues/1823
 */
import { http, Path, HttpResponse, DefaultBodyType } from 'msw'

it('accepts custom response body generic argument', () => {
  function myHandler<CustomResponseBodyType extends DefaultBodyType>(
    path: Path,
  ) {
    return (response: CustomResponseBodyType) => {
      http.get(path, () => HttpResponse.json(response))
    }
  }
})
