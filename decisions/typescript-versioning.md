# TypeScript versioning

## Strict TypeScript peer dependency version

In the past, MSW set the explicit upper version range for the `typescript` peer dependency (`>= 4.4.x <= 5.1.x`). While that provides better stability and predictability, we acknowledge that it negatively impacts our users, forcing them to wait for MSW to update the TypeScript version range in order to migrate to newest versions of TypeScript in their projects.

> Context: TypeScript is [not distributed according to semver](https://github.com/microsoft/TypeScript/issues/14116). Instead, it's `{marketing}.{major}.{minor}` versioning pattern. This means that it may and does contain breaking changes across what consumers perceive as _minor_ versions. I've had numerous fights with this as it's not uncommon for TypeScript to exhibit different behavior across minor versions (the same types compile on 4.6, break on 4.7, then compile without issue on 4.8).

With this in mind, _we are removing the upper range_ of the `typescript` peer dependency. We have an [automated job](../.github/workflows/typescript-nightly.yml) in place that validates the latest build of MSW against the nightly releases of TypeScript, which should ensure early issue detection and help us resolve those issues before they happen.

## TypeScript version compliance

Every version within the `typescript` peer dependency version range must have a corresponding TypeScript compliance test to guarantee the library's operatbility on that version.

A compliance test is represented as a regular _typings test_ compiled using a specific version of TypeScript. You can learn more in the [typings tests](/test/typings).

The typings test will automatically attempt to look up `tsconfig.{major}.{minor}.json` file corresponding to the currently installed version of TypeScript. The compliance is then achieved by installing different TypeScript versions from the supported range and running the existing typings tests on that version.
