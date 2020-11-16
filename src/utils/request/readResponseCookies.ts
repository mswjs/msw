import { store } from 'virtual-cookies'
import { MockedResponse } from '../../response'
import { MockedRequest } from '../../handlers/RequestHandler'

export function readResponseCookies(req: MockedRequest, res: MockedResponse) {
  store.add({ ...req, url: req.url.toString() }, res)
  store.persist()
}
