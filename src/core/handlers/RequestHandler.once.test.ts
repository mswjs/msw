import { it, expect } from 'vitest'
import { http } from '../http'
import { HttpResponse } from '../HttpResponse'
import { ResponseResolutionContext } from '../utils/executeHandlers'

const resolutionContext: ResponseResolutionContext = {
  baseUrl: 'http://localhost',
}

it('supports one-time response from the resolver', async () => {
  let counter = 0
  const handler = http.get('http://localhost/resource', () => {
    counter++
    if (counter === 1) {
      return HttpResponse.text('hello', { once: true })
    }
    return HttpResponse.text('world')
  })

  const request = new Request('http://localhost/resource')
  
  // 1st run
  const result1 = await handler.run({ 
    request, 
    requestId: 'req-1',
    resolutionContext 
  })
  
  expect(result1).not.toBeNull()
  expect(result1?.response).toBeDefined()
  expect(await result1?.response?.text()).toBe('hello')
  expect(handler.isUsed).toBe(true)

  // 2nd run - should be skipped because the previous response was "once: true"
  const result2 = await handler.run({
     request, 
     requestId: 'req-2',
     resolutionContext
  })

  expect(result2).toBeNull()
})

it('supports mixing persistent and one-time responses', async () => {
    let counter = 0
    const handler = http.get('http://localhost/resource', () => {
      counter++
      if (counter === 1) {
        return HttpResponse.text('persistent')
      }
      if (counter === 2) {
        return HttpResponse.text('one-time', { once: true })
      }
      return HttpResponse.text('unreachable')
    })
  
    const request = new Request('http://localhost/resource')
    
    // 1st run: persistent
    const result1 = await handler.run({ 
      request, 
      requestId: 'req-1',
      resolutionContext 
    })
    expect(await result1?.response?.text()).toBe('persistent')
    
    // 2nd run: one-time
    const result2 = await handler.run({ 
        request, 
        requestId: 'req-2',
        resolutionContext 
    })
    expect(await result2?.response?.text()).toBe('one-time')
    
    // 3rd run: should skip
    const result3 = await handler.run({ 
        request, 
        requestId: 'req-3',
        resolutionContext 
    })
    expect(result3).toBeNull()
})
