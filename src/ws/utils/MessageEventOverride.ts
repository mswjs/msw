export class MessageEventOverride<Data> extends Event {
  data?: Data

  constructor(type: string, data?: Data) {
    super(type)
    this.data = data
  }
}
