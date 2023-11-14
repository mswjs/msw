export type DisposableSubscription = () => Promise<void> | void

export class Disposable {
  protected subscriptions: Array<DisposableSubscription> = []

  public async dispose() {
    await Promise.all(this.subscriptions.map((subscription) => subscription()))
  }
}
