export class MessageEventOverride<Data> extends Event {
  data: Data | undefined

  constructor(type: string, data?: Data) {
    super(type)
    this.data = data
  }
}
