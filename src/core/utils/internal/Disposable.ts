import { devUtils } from './devUtils'

export type DisposableSubscription = () => void

export class Disposable {
  protected subscriptions: Array<DisposableSubscription> = []

  public dispose() {
    let subscription: DisposableSubscription | undefined
    const errors: Array<Error> = []

    while ((subscription = this.subscriptions.shift())) {
      try {
        subscription()
      } catch (error) {
        if (error instanceof Error) {
          errors.push(error)
        }
      }
    }

    if (errors.length > 0) {
      console.error(
        new AggregateError(
          errors,
          devUtils.formatMessage(
            'Failed to dispose of some side effects. This is likely an issue with MSW, please report it on GitHub: https://github.com/mswjs/msw/issues',
          ),
        ),
      )
    }
  }
}
