# create-react-app

This is an example repository of how to integrate MSW into a [`create-react-app`](https://create-react-app.dev/) application.

## Install

```bash
npm install msw --save-dev
```

## Initiate

```bash
msw init public
```

> We are using "public" as the `rootDir` because `create-react-app` serves files from the "public" directory.

## Run the applcation

```bash
npm start
```

Edit the `src/mocks.js` file and see the mocking in action.
