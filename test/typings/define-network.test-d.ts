import { DefaultEventMap, Emitter, TypedEvent } from 'rettime'
import { defineNetwork, NetworkSource, NetworkFrame } from 'msw/experimental'

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
  }).events.on('*', (event) => {
    expectTypeOf(event.type).toEqualTypeOf<'hello'>()
    expectTypeOf(event.data).toEqualTypeOf<'world'>()
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
  }).events.on('*', (event) => {
    expectTypeOf(event.type).toEqualTypeOf<'hello' | 'goodbye'>()
    expectTypeOf(event.data).toEqualTypeOf<'world' | 'cosmos'>()
  })
})

it('infers return type of "enable" based on the sources return type', () => {
  type HttpFrame = NetworkFrame<'http', void, { hello: TypedEvent<'world'> }>
  class AsyncHttpSource extends NetworkSource<HttpFrame> {
    public async enable() {}
  }
  class SyncHttpSource extends NetworkSource<HttpFrame> {
    public enable() {}
  }

  {
    const network = defineNetwork({ sources: [new AsyncHttpSource()] })
    expectTypeOf(network.enable).returns.toEqualTypeOf<Promise<void>>()
  }
  {
    const network = defineNetwork({ sources: [new SyncHttpSource()] })
    expectTypeOf(network.enable).returns.toEqualTypeOf<void>()
  }
  {
    const network = defineNetwork({
      sources: [new AsyncHttpSource(), new SyncHttpSource()],
    })
    expectTypeOf(network.enable).returns.toEqualTypeOf<Promise<void>>()
  }
})

it('infers return type of "disable" based on the sources return type', () => {
  type HttpFrame = NetworkFrame<'http', void, { hello: TypedEvent<'world'> }>

  class AsyncHttpSource extends NetworkSource<HttpFrame> {
    public async enable() {}
    public async disable() {}
  }
  class SyncHttpSource extends NetworkSource<HttpFrame> {
    public enable() {}
    public disable() {}
  }

  {
    const network = defineNetwork({ sources: [new AsyncHttpSource()] })
    expectTypeOf(network.disable).returns.toEqualTypeOf<Promise<void>>()
  }
  {
    const network = defineNetwork({ sources: [new SyncHttpSource()] })
    expectTypeOf(network.disable).returns.toEqualTypeOf<void>()
  }
  {
    const network = defineNetwork({
      sources: [new AsyncHttpSource(), new SyncHttpSource()],
    })
    expectTypeOf(network.disable).returns.toEqualTypeOf<Promise<void>>()
  }
})
