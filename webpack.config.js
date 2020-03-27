const path = require('path')
const {
  SERVICE_WORKER_SOURCE_PATH,
  SERVICE_WORKER_BUILD_PATH,
} = require('./config/constants')
const { IntegrityWebpackPlugin } = require('./config/IntegrityWebpackPlugin')

module.exports = {
  mode: process.env.NODE_ENV,
  entry: ['regenerator-runtime/runtime', path.resolve(__dirname, 'src/index')],
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
            loader: 'awesome-typescript-loader',
          },
        ],
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
