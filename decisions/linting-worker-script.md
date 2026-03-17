# Linting the worker script

When linting your application, you may encounter warnings or errors originating from the `mockServiceWorker.js` script. Please refrain from opening pull requests to add the `ignore` pragma comments to the script itself.

## Solution

**Make sure that the worker script is ignored by your linting tools**. The worker script isn't a part of your application's code but a static asset. It must be ignored during linting and prettifying in the same way all your static assets in `/public` are ignored. Please configure your tools respectively.

If there are warnings/errors originating from the worker script, it's likely your public directory is not ignored by your linting tools. You may consider ignoring the entire public directory if that suits your project's conventions.
