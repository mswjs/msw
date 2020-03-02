const path = require('path')

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
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
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
    ],
  },
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
