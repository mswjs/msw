export type HandlerOptions = {
  once?: boolean
}

export abstract class Handler<Input = unknown> {
  public isUsed: boolean

  constructor(protected readonly options: HandlerOptions = {}) {
    this.isUsed = false
  }

  abstract parse(args: { input: Input }): unknown
  abstract predicate(args: { input: Input; parsedResult: unknown }): boolean
  protected abstract handle(args: {
    input: Input
    parsedResult: unknown
  }): Promise<unknown | null>

  public async run(input: Input): Promise<unknown | null> {
    if (this.options?.once && this.isUsed) {
      return null
    }

    const parsedResult = this.parse({ input })
    const shouldHandle = this.predicate({
      input,
      parsedResult,
    })

    if (!shouldHandle) {
      return null
    }

    const result = await this.handle({
      input,
      parsedResult,
    })

    this.isUsed = true

    return result
  }
}
