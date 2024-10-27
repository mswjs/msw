# Releases

MSW uses the [Release](https://github.com/ossjs/release) library to automate its releases to NPM.

## Release schedule

The next version of **the library releases automatically every day**.

We do our best to choose the optimal release window to accumulate multiple changes under a single release. We do deviate from the release schedule in emergency cases, like when a critical issue has been fixed and needs an immediate release.

> [!IMPORTANT]
> Please do not ping the library maintainers to release a new version of MSW. Be patient and wait for the automated release to happen. Subscribe to any issue or pull request you are interested in, and you will be notified whenever it gets released.

## Preview releases

This repository is configured to **release work-in-progress pull requests** using [okg.pr.new](https://github.com/stackblitz-labs/pkg.pr.new). Once the pull request in question is approved, it will automatically be published to a temporary registry. Follow the instructions in the automated comment to install the work-in-progress version of the package.
