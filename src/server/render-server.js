// Utility function to exit on error
const _exit = (m) => {
  console.error(m)
  process.exit(1)
}

const path = require('path')
const fs = require('fs')
const { createBundleRenderer } = require('vue-server-renderer')

const VUE_SSR_BUILD_DIR = path.resolve(__dirname, '../../build/')
const VUE_TEMPLATE_DIR = process.env.VUE_TEMPLATE_DIR ? path.resolve(process.env.VUE_TEMPLATE_DIR) : null
const VUE_COMPONENT_DIR = process.env.VUE_COMPONENT_DIR ? path.resolve(process.env.VUE_COMPONENT_DIR) : _exit("Component directory not defined - please set VUE_COMPONENT_DIR environment variable")
const VUE_ROUTES_FILE = process.env.VUE_ROUTES_FILE ? path.resolve(process.env.VUE_ROUTES_FILE) : _exit("Routes file must be specified - please set VUE_ROUTES_FILE environment variable")
const VUE_CLIENT_BUILD_DIR = process.env.VUE_CLIENT_BUILD_DIR ? path.resolve(process.env.VUE_CLIENT_BUILD_DIR) : VUE_SSR_BUILD_DIR
const VUE_CLIENT_BUILD_DIR_PUBLIC_PATH = process.env.VUE_CLIENT_BUILD_DIR_PUBLIC_PATH ? path.resolve(process.env.VUE_CLIENT_BUILD_DIR_PUBLIC_PATH) : "/"
const NODE_ENV = process.env.NODE_ENV || "development"

// If we're doing templates (aka layouts), synchronously load them into an in-memory array.  
// Since templates are almost always going to be super lightweight, for now sync + in-memory is fine.
const templateFiles = []

if (VUE_TEMPLATE_DIR) {
  fs.readdirSync(VUE_TEMPLATE_DIR).forEach(file => {
    let name = path.parse(file).name + path.parse(file).ext
    let filepath = path.resolve(VUE_TEMPLATE_DIR, file)
    let stat = fs.statSync(filepath)
    let isFile = stat.isFile()
    if (isFile) {
      let body = fs.readFileSync(filepath, 'utf-8')
      templateFiles.push({ name, body })
    }
  })
}

// HTTP & webpack-related imports.
const http = require('http')
const port = process.env.NODE_PORT || 4000
const webpack = require('webpack')
const merge = require('webpack-merge')
const webpackDevMiddleware = require('webpack-dev-middleware')
const webpackHotMiddleware = require('webpack-hot-middleware')
const webpackServerConfig = require('../../config/webpack/webpack-vue-server-cfg.js')
const webpackClientConfig = require('../../config/webpack/webpack-vue-client-cfg.js')

const webpackCommonVariableConfig = {
  mode: NODE_ENV,
  output: {
    path: VUE_SSR_BUILD_DIR,
    publicPath: VUE_CLIENT_BUILD_DIR_PUBLIC_PATH
  },
  resolve: {
    alias: {
      components: VUE_COMPONENT_DIR,
      vueRoutes$: VUE_ROUTES_FILE
    }
  }
}

// Modify client config for hot reloading in dev
// if (NODE_ENV == 'development') {
//   webpackClientConfig.entry.client = ['webpack-hot-middleware/client', webpackClientConfig.entry.client]
//   webpackClientConfig.output.filename = '[name].js'
//   webpackClientConfig.plugins.push(
//     new webpack.HotModuleReplacementPlugin(),
//     new webpack.NoEmitOnErrorsPlugin()
//   )
// }

const webpackCompiler = webpack([
  merge(webpackCommonVariableConfig, webpackClientConfig),
  merge(webpackCommonVariableConfig, webpackServerConfig)
])

// Our actual render workhorse - this is called on each request to do the actual SSR.  
// Takes a serverBundle & clientManifest, which come from webpack's memory FS in development
// and will live on disk (pre-built) in production
const doRender = (serverBundle, clientManifest) => {
  return (req, res) => {

    // We're using the WHATWG URL standard since it's a mostly-standard, but that binds us to Node 8+
    let url = new URL(`http://localhost:${port}${req.url}`)
    let pathname = url.pathname
    let templateRequested = url.searchParams.get('template')
    let templateResult = templateFiles.find(file => file.name == templateRequested)
    let template = templateResult ? templateResult.body : null

    console.log(`[node] SSR request received - ${req.url}`)
    console.log(`[node] type: ${req.method}, path: ${pathname}, template: ${templateRequested}`)

    // This is the core vue-ssr method that builds the SSR.
    // See https://ssr.vuejs.org/guide/bundle-renderer.html
    let renderer = createBundleRenderer(serverBundle, {
      template,
      clientManifest,
      runInNewContext: false
    })

    // We use the HTTP body to pass a JSON object containing the crystal-rendered parameters.
    // Probably a better/more robust way to do this, but it's simple and works for now.
    let body = [];
    let vueContext = {};

    req.on('error', (err) => {
      console.log(err)
    }).on('data', (chunk) => {
      body.push(chunk)
    }).on('end', () => {

      let rawBody = Buffer.concat(body).toString()

      if (rawBody) {
        Object.assign(vueContext, JSON.parse(rawBody))
      }

      let context = { pathname, vueContext }

      console.log(`[node] Context going into render:`)
      console.log(context)

      renderer.renderToString(context, (err, html) => {
        if (err) {
          res.write(`error: ${err}`)
          return
        }
        res.end(html)
      })
    })
  }
}

// Define our node http server and configure for long-running connections (keepAlive)
const server = new http.Server({
  timeout: 0,
  keepAliveTimeout: 0
})

// Define the callback for webpack after compilation.  We can use the same one for dev & prod.
// TODO: (Bug) - this gets called on each compile, and because there's a client & server build,
// the http server listener is added, removed, then added again on each compile.
const webpackCompileCallback = (err, stats) => {

  // Webpack has 3 types of error - webpack errors, compile errors, and compile warnings
  // The first two mean we've got a real problem, so abort the node process.
  // The third doesn't necessarily mean baddness ensures, so keep going.
  // This section inspirted by https://webpack.js.org/api/node/#error-handling

  // err == an actual webpack compile error
  if (err) {
    console.error(err.stack || err);
    if (err.details) {
      console.err(err.details)
    }
    process.exit(1)
  }

  // stats.hasErrors() == a compilation error, so log output to console.error & exit
  if (stats.hasErrors()) {
    console.error(stats.toString({
      chunks: false,
      colors: true,
      modules: false
    }))
    process.exit(1)
  }

  // Otherwise logs the stats to console.info...
  console.log(stats.toString({
    chunks: false,
    colors: true,
    modules: false
  }))


  // Otherwise, the compile was good, so proceed...
  // If there's an existing server, clear listeners and close.
  if (server.listening) {
    server.removeAllListeners('request')
    server.close()
  }

  const serverBundle = JSON.parse(fs.readFileSync(path.resolve(VUE_SSR_BUILD_DIR, 'vue-ssr-server-bundle.json')))
  const clientManifest = JSON.parse(fs.readFileSync(path.resolve(VUE_SSR_BUILD_DIR, 'vue-ssr-client-manifest.json')))

  // Webpack doesn't support multiple output within a single config file, and we need to put the client JSON
  // bundle in the server dist directory, but the client JS file in the calling webserver's output directory
  // so we do this with a symlink.  This feels hack-y, but for now it'll have to do.

  try {
    fs.symlinkSync(path.resolve(VUE_SSR_BUILD_DIR, 'cvue.client.js'), path.resolve(VUE_CLIENT_BUILD_DIR, 'cvue.client.js'))
  } catch (e) {
    if (e.code == 'EEXIST') {
      console.log('[node] Symlink already exists - moving on...')
    } else {
      throw e
    }
  }

  server.on('request', doRender(serverBundle, clientManifest))
  server.listen((port), () => {
    console.log(`[node] SSR renderer listening in ${NODE_ENV} mode on port ${port}`);
  })

  // handle exceptions gracefully so our client doesn't die of loneliness
  process.on('uncaughtException', err => {
    console.error(`[node] Error w/ node process: ${err}`)
    server.close(() => process.exit(1))
  })
}

// webpack watch if development, otherwise asume we're in prod or test and compile once.
if (NODE_ENV == "development") {
  webpackCompiler.watch({}, webpackCompileCallback)
} else {
  webpackCompiler.run(webpackCompileCallback)
}