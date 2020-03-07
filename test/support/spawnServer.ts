import * as path from 'path'
import { AddressInfo } from 'net'
import * as chalk from 'chalk'
import * as webpack from 'webpack'
import * as WebpackDevServer from 'webpack-dev-server'
import * as HtmlWebpackPlugin from 'html-webpack-plugin'
import * as packageJson from '../../package.json'

interface Payload {
  server: WebpackDevServer
  origin: string
}

export const spawnServer = (componentPath: string): Promise<Payload> => {
  const absoluteComponentPath = path.resolve(process.cwd(), componentPath)
  const mswModulePath = path.resolve(__dirname, '../..', packageJson.main)

  console.log('Loading component from: %s', chalk.cyan(absoluteComponentPath))
  console.log('Resolving "msw" module from: %s', chalk.cyan(mswModulePath))

  const compiler = webpack({
    mode: 'development',
    target: 'web',
    entry: path.resolve(__dirname, 'renderer'),
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          loaders: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env', '@babel/preset-react'],
              },
            },
            {
              loader: 'awesome-typescript-loader',
              options: {
                configFileName: path.resolve(__dirname, 'tsconfig.json'),
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: 'test/support/index.html',
      }),
      new webpack.DefinePlugin({
        TEST_COMPONENT_PATH: JSON.stringify(absoluteComponentPath),
      }),
    ],
    resolve: {
      alias: {
        msw: mswModulePath,
      },
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
    },
  })

  const wds = new WebpackDevServer(compiler, {
    historyApiFallback: true,
    contentBase: path.resolve(__dirname, '../..'),
    publicPath: '/',
    noInfo: true,
    openPage: '/test/support',
  })

  return new Promise((resolve, reject) => {
    const server = wds.listen(0, 'localhost', (error) => {
      if (error) {
        return reject(error)
      }

      const { port } = server.address() as AddressInfo
      resolve({ server: wds, origin: `http://localhost:${port}` })
    })
  })
}
