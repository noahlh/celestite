import { readdirSync, statSync, readFileSync } from "fs";
import { resolve as _resolve, parse, join } from "path";
import { performance } from "perf_hooks";
import { build, createConfiguration, startServer, clearCache } from "snowpack";
import polka from "polka";
import pkg from "body-parser";
const { json } = pkg;

// Bring out yer environment vars...(*ding*)!
const {
  NODE_ENV,
  NODE_PORT,
  ROOT_DIR,
  COMPONENT_DIR,
  LAYOUT_DIR,
  BUILD_DIR,
} = process.env;

const dev = NODE_ENV == "development";

// Snowpack SSR config
const serverConfig = createConfiguration({
  plugins: [
    [
      "@snowpack/plugin-svelte",
      {
        compilerOptions: {
          generate: "ssr",
          hydratable: true,
          dev,
        },
      },
    ],
  ],
  mount: {
    [COMPONENT_DIR]: "/",
  },
  devOptions: {
    port: 0,
  },
  root: ROOT_DIR,
});

// Snowpack client config
const clientConfig = createConfiguration({
  // CSS will be duplicated in development because Snowpack needs the .proxy.css.js files
  // to support hot reloading.  Not a big deal, just something to be aware of.
  // TODO: When building for production, use webpack plugin to bundle.

  plugins: [
    [
      "@snowpack/plugin-svelte",
      {
        compilerOptions: {
          hydratable: true,
          css: false,
          dev,
        },
      },
    ],
  ],
  mount: {
    [COMPONENT_DIR]: "/",
  },
  buildOptions: {
    out: BUILD_DIR,
    clean: true,
    watch: false,
  },
  root: ROOT_DIR,
});

// Simple logging middleware
function logger(req, res, next) {
  console.log(
    `[node] ${req.method} ${req.path} ${res.statusCode} - ${(
      performance.now() - req.startTime
    ).toPrecision(3)}ms`
  );
  res.end();
}

function startTimer(req, res, next) {
  req.startTime = performance.now();
  next();
}

// If we're doing layouts, synchronously load them into an in-memory array.
// Since layouts are almost always going to be super lightweight, for now synchronous + in-memory is fine.
const layoutFiles = [];

if (LAYOUT_DIR) {
  readdirSync(LAYOUT_DIR).forEach((file) => {
    const name = parse(file).name + parse(file).ext;
    const filepath = _resolve(LAYOUT_DIR, file);
    const stat = statSync(filepath);
    const isFile = stat.isFile();
    if (isFile) {
      const body = readFileSync(filepath, "utf-8");
      layoutFiles.push({ name, body });
    }
  });
}

// Initialize Snowpack
clearCache();
const { result } = await build({ config: clientConfig });
const snowpackServer = await startServer({ config: serverConfig });
const snowpackRuntime = snowpackServer.getServerRuntime();
const svelteRenderHandler = initializeSvelteRenderHandler(
  snowpackServer,
  snowpackRuntime,
  layoutFiles
);

// Take the snowpack runtime & layouts and return a middleware to handle the actual render
function initializeSvelteRenderHandler(
  snowpackServer,
  snowpackRuntime,
  layoutFiles
) {
  return async (req, res, next) => {
    const { pathname, layoutRequested } = parseUrl(req.url);
    const { layout } = getLayout(layoutRequested, layoutFiles);
    let componentURL = snowpackServer.getUrlForFile(
      join(COMPONENT_DIR, pathname)
    );
    let importedComponent;

    try {
      importedComponent = await snowpackRuntime.importModule(componentURL);
    } catch (error) {
      res.statusCode = 500;
      console.error(error.message);
      console.error(error.stack);
      next();
      return;
    }

    const component = importedComponent.exports.default;
    let ssr;
    try {
      ssr = component.render({
        context: req.body,
      });
    } catch (error) {
      res.statusCode = 500;
      console.error(error.message);
      console.error(error.stack);
      next();
      return;
    }

    let injectHead = ssr.head || "";
    if (ssr.css && ssr.css.code) {
      injectHead += `<style>${ssr.css.code}</style>`;
    }

    let clientJs = (({ pathname, body }) => {
      return ` 
        import App from "${pathname}.js";
        const app = new App({
          target: document.querySelector("#celestite-server-rendered"),
          hydrate: true,
          props: {
            context: ${JSON.stringify(body)}
          },
        });
      `;
    })({ pathname, body: req.body });

    let injectClient = `<script type='module'>${clientJs}</script>`;

    const output = layout
      .replace("<!-- CELESTITE HEAD -->", injectHead)
      .replace("<!-- CELESTITE BODY -->", ssr.html)
      .replace("<!-- CELESTITE CLIENT -->", injectClient);

    res.write(output);
    next();
  };
}

function parseUrl(reqURL) {
  const url = new URL(reqURL, "http://localhost");
  const pathname = url.pathname;
  const layoutRequested = url.searchParams.get("layout");
  return { pathname, layoutRequested };
}

function getLayout(layoutRequested, layoutFiles) {
  const layoutResult = layoutFiles.find((file) => file.name == layoutRequested);
  const layout = layoutResult ? layoutResult.body : null;
  return { layout };
}

// Initialize Polka
polka()
  .get("*", startTimer, svelteRenderHandler, logger)
  .post("*", startTimer, json(), svelteRenderHandler, logger)
  .listen(NODE_PORT, (err) => {
    if (err) console.error("error: ", err);
    console.log(
      `[node] Svelte SSR renderer listening in ${NODE_ENV} mode on port ${NODE_PORT}`
    );
  });
