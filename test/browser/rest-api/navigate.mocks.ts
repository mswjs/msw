import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker()

worker.start()

Object.assign(window, {
  msw: {
    worker,
    http,
    HttpResponse,
  },
})

const form = document.createElement('form')
form.method = 'POST'
form.action = '/action'

const input = document.createElement('input')
input.setAttribute('name', 'username')
input.setAttribute('aria-label', 'Username')

const submitButton = document.createElement('button')
submitButton.textContent = 'Submit'

form.append(input, submitButton)
document.body.append(form)
