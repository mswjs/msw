import { DefaultEventMap, Emitter, TypedEvent } from 'rettime'
import { defineNetwork } from '../../src/core/new/define-network'
import { NetworkSource } from '../../src/core/new/sources/network-source'
import { NetworkFrame } from '../../src/core/new/frames/network-frame'

it('uses an empty event map when no sources were provided', () => {
  expectTypeOf(
    defineNetwork({
      sources: [],
    }).events,
  ).toExtend<Emitter<DefaultEventMap>>
})

it('infers event map type from a single source', () => {
  type HttpFrame = NetworkFrame<'http', void, { hello: TypedEvent<'world'> }>

  class HttpSource extends NetworkSource<HttpFrame> {
    public async enable() {}
  }

  defineNetwork({
    sources: [new HttpSource()],
  }).events.on((event) => {
    expectTypeOf(event.type).toExtend<'hello'>()
    expectTypeOf(event.data).toExtend<'world'>()
    expectTypeOf(event.data).not.toBeAny()
  })
})

it('combines event maps from different sources', () => {
  type HttpFrame = NetworkFrame<'http', void, { hello: TypedEvent<'world'> }>
  class HttpSource extends NetworkSource<HttpFrame> {
    public async enable() {}
  }

  type SmtpFrame = NetworkFrame<'smtp', void, { goodbye: TypedEvent<'cosmos'> }>
  class SmtpSource extends NetworkSource<SmtpFrame> {
    public async enable() {}
  }

  defineNetwork({
    sources: [new HttpSource(), new SmtpSource()],
  }).events.on((event) => {
    expectTypeOf(event.type).toExtend<'hello' | 'goodbye'>()
    expectTypeOf(event.data).toExtend<'world' | 'cosmos'>()
    expectTypeOf(event.data).not.toBeAny()
  })
})
