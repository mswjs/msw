const path = require('path')
const {
  SERVICE_WORKER_SOURCE_PATH,
  SERVICE_WORKER_BUILD_PATH,
} = require('./config/constants')
const { IntegrityWebpackPlugin } = require('./config/IntegrityWebpackPlugin')

module.exports = {
  mode: process.env.NODE_ENV,
  entry: [
    'regenerator-runtime/runtime',
    SERVICE_WORKER_SOURCE_PATH,
    path.resolve(__dirname, 'src/index'),
  ],
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'lib'),
    library: 'MockServiceWorker',
    libraryTarget: 'umd',
    umdNamedDefine: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
          },
          {
            loader: 'ts-loader',
          },
        ],
      },
      {
        // Ignore the Service Worker module so that its changes trigger the rebuild,
        // but the module itself is not included in the built bundle.
        test: SERVICE_WORKER_SOURCE_PATH,
        use: 'ignore-loader',
      },
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
    ],
  },
  plugins: [
    new IntegrityWebpackPlugin({
      src: SERVICE_WORKER_SOURCE_PATH,
      output: SERVICE_WORKER_BUILD_PATH,
    }),
  ],
  optimization: {
    minimize: false,
  },
  resolve: {
    extensions: [
      '*',
      '.mjs',
      '.ts',
      '.js',
      '.vue',
      '.json',
      '.gql',
      '.graphql',
    ],
  },
}
