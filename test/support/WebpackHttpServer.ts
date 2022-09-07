import * as path from 'path'
import type { Server } from 'http'
import { invariant } from 'outvariant'
import crypto from 'crypto'
import express from 'express'
import webpack from 'webpack'
import { IFs, createFsFromVolume, Volume } from 'memfs'

export interface WebpackHttpServerOptions {
  before?(app: express.Application): void
  webpackConfig?: Omit<webpack.Configuration, 'entry'>
}

export type CompilationResult = {
  id: string
  stats: webpack.Stats
}

export class WebpackHttpServer {
  private app: express.Express
  private server: Server
  private compilations: Map<string, webpack.Stats>
  private fs: IFs

  constructor(private readonly options: WebpackHttpServerOptions = {}) {
    this.fs = createFsFromVolume(new Volume())
    this.compilations = new Map()
    this.app = express()
    this.app.use(express.json())

    this.options.before?.(this.app)

    // Prevent Express from responding with cached 304 responses.
    this.app.set('etag', false)

    /**
     * Preview route for a single compilation.
     */
    this.app.get('/compilation/:id', async (req, res) => {
      const { id } = req.params

      if (!this.compilations.has(id)) {
        return res.status(404).send('Compilation not found')
      }

      const html = await this.renderPreview(id)
      return res.send(html)
    })

    /**
     * Serve compilation assets from the memory FS.
     */
    this.app.use('/compilation/:id/:assetPath', useMemoryFs(this.fs))

    /**
     * Handle a new compilation request.
     */
    this.app.post('/compilation', async (req, res) => {
      const entries = Array.prototype.concat([], req.body.entry)

      if (!entries.every((entry) => path.isAbsolute(entry))) {
        return res.status(400).send('Entry path must be absolute.')
      }

      const result = await this.compile(entries)
      const previewUrl = new URL(`/compilation/${result.id}`, this.serverUrl)

      return res.json({
        previewUrl: previewUrl.href,
      })
    })
  }

  private get serverUrl(): string {
    const address = this.server.address()

    if (typeof address === 'string') {
      return address
    }

    return `http://localhost:${address.port}`
  }

  public async listen(): Promise<void> {
    this.server = this.app.listen(8044, 'localhost', () => {
      console.log('webpack http server running at "%s"', this.serverUrl)
    })
  }

  public async close(): Promise<void> {
    this.compilations.clear()
    this.fs.reset()

    invariant(this.server, 'Failed to close server: no server running')

    return new Promise<void>((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          return reject(error)
        }
        resolve()
      })
    })
  }

  private async compile(entries: Array<string>): Promise<CompilationResult> {
    const compilationId = crypto.createHash('md5').digest('hex')

    const config: webpack.Configuration = {
      ...(this.options.webpackConfig || {}),
      mode: 'development',
      output: {
        path: path.resolve('compilation', compilationId, 'dist'),
      },
      entry: {
        main: entries,
      },
    }

    const compiler = webpack(config)

    // Compile assets to memory so that the preview could
    // serve those assets from memory also.
    compiler.outputFileSystem = this.fs

    return new Promise((resolve) => {
      compiler.watch({ poll: 1000 }, (error, stats) => {
        if (error || stats.hasErrors()) {
          console.log('Compiled with errors')
          return
        }

        this.handleIncrementalBuild(compilationId, stats)

        resolve({
          id: compilationId,
          stats,
        })
      })
    })
  }

  private handleIncrementalBuild(
    compilationId: string,
    stats: webpack.Stats,
  ): void {
    this.compilations.set(compilationId, stats)
  }

  private async renderPreview(compilationId: string): Promise<string> {
    invariant(
      this.compilations.has(compilationId),
      'Failed to render preview for compilation "%s": compilation not found',
      compilationId,
    )

    const compilation = this.compilations.get(compilationId)
    const entries = compilation.compilation.entries
      .get('main')
      .dependencies.map((dependency) => {
        return (dependency as any).request
      })
    const { chunks } = compilation.compilation
    const assets: Array<string> = []

    for (const chunk of chunks) {
      for (const filename of chunk.files) {
        assets.push(`/compilation/${compilationId}/${filename}`)
      }
    }

    return `\
<html>
  <head>
    <title>Preview</title>
  </head>
  <body>
    <h2>Preview</h2>
    <ul>${entries
      .map(
        (filePath) => `
<li><a href="vscode://file${filePath}">${filePath}</a></li>
    `,
      )
      .join('')}</ul>
    ${assets
      .map((assetPath) => `<script src="${assetPath}"></script>`)
      .join('')}
  </body>
</html>`
  }
}

function useMemoryFs(
  fs: IFs,
): express.RequestHandler<{ id: string; assetPath: string }> {
  return (req, res) => {
    const filePath = path.join(
      'compilation',
      req.params.id,
      'dist',
      req.params.assetPath,
    )

    if (!fs.existsSync(filePath)) {
      return res.status(404)
    }

    const stream = fs.createReadStream(filePath, 'utf8')
    stream
      .pipe(res)
      .once('error', console.error)
      .on('end', () => res.end())
  }
}

/**
 * Usage.
 */
import * as fs from 'fs'
import { collapseTextChangeRangesAcrossMultipleVersions } from 'typescript'

const { SERVICE_WORKER_BUILD_PATH } = require('../../config/constants.js')

const server = new WebpackHttpServer({
  before(app) {
    app.get('/mockServiceWorker.js', (req, res) => {
      const readable = fs.createReadStream(SERVICE_WORKER_BUILD_PATH)
      res.set('Content-Type', 'application/javascript; charset=utf8')
      res.set('Content-Encoding', 'chunked')
      readable.pipe(res)
    })
  },
  webpackConfig: {
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: path.resolve(__dirname, '../..', 'tsconfig.json'),
                transpileOnly: true,
              },
            },
          ],
        },
      ],
    },
    resolve: {
      alias: {
        msw: path.resolve(__dirname, '../..'),
      },
      extensions: ['.ts', '.js'],
    },
  },
})

server.listen()
