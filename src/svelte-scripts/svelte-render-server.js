import { readdirSync, statSync, readFileSync } from "fs";
import { resolve as _resolve, parse, join } from "path";
import { performance } from "perf_hooks";
import { build, createConfiguration, startServer, clearCache } from "snowpack";
import polka from "polka";
import pkg from "body-parser";
const { json } = pkg;

// Bring out yer environment vars...(*ding*)!
const { NODE_ENV, NODE_PORT, ROOT_DIR, COMPONENT_DIR, LAYOUT_DIR, BUILD_DIR } =
  process.env;

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
  buildOptions: {
    out: join(BUILD_DIR, "server"),
    clean: true,
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
  devOptions: {
    hmr: true,
    port: 8080,
    open: "none",
    output: "stream",
  },
  packageOptions: {
    rollup: {
      dedupe: ["svelte"],
    },
  },
  buildOptions: {
    out: join(BUILD_DIR, "client"),
    clean: true,
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

function loadSupportFiles(dir) {
  let tempArray = [];
  readdirSync(dir).forEach((file) => {
    const name = parse(file).name + parse(file).ext;
    const filepath = _resolve(dir, file);
    const stat = statSync(filepath);
    const isFile = stat.isFile();
    if (isFile) {
      const body = readFileSync(filepath, "utf-8");
      tempArray.push({ name, body });
    }
  });
  return tempArray;
}

// If we're doing layouts, synchronously load them into an in-memory array.
// Since layouts are almost always going to be super lightweight, for now synchronous + in-memory is fine.
let layoutFiles = [];

if (LAYOUT_DIR) {
  layoutFiles = loadSupportFiles(LAYOUT_DIR);
}

let svelteRenderHandler;

clearCache();

NODE_ENV == "production"
  ? await build({ config: clientConfig })
  : await startServer({ config: clientConfig });

const snowpackServer = await startServer({ config: serverConfig });
const snowpackRuntime = snowpackServer.getServerRuntime();
svelteRenderHandler = initializeSvelteRenderHandler({
  snowpackServer,
  snowpackRuntime,
  layoutFiles,
  env: NODE_ENV,
});

function initializeSvelteRenderHandler({
  snowpackServer,
  snowpackRuntime,
  layoutFiles,
  env,
}) {
  return async (req, res, next) => {
    const { pathname, layoutRequested } = parseUrl(req.url);
    const layout = getFile(layoutRequested, layoutFiles);
    let component;

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
    component = importedComponent.exports.default;

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

    let clientJs;
    let injectClient;

    if (env == "development") {
      clientJs = (({ pathname, body }) => {
        return ` 
          import App from "http://localhost:8080${pathname}.js";  
          const app = new App({
            target: document.querySelector("#celestite-app"),
            hydrate: true,
            props: {
              context: ${JSON.stringify(body)}
            },
          });

          if (import.meta.hot) {
            import.meta.hot.accept();
            import.meta.hot.dispose(() => {
              app.$destroy();
            });
          }
        `;
      })({ pathname, body: req.body });

      injectClient = `
        <script>window.HMR_WEBSOCKET_URL = 'ws://localhost:8080';</script>
        <script type="module" src="http://localhost:8080/_snowpack/hmr-client.js"></script>
        <script type='module'>${clientJs}</script>
      `;
    } else {
      clientJs = (({ pathname, body }) => {
        return ` 
          import App from "/client${pathname}.js";  
          const app = new App({
            target: document.querySelector("#celestite-app"),
            hydrate: true,
            props: {
              context: ${JSON.stringify(body)}
            },
          });
        `;
      })({ pathname, body: req.body });

      injectClient = `
        <script type='module'>${clientJs}</script>
      `;
    }

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

function getFile(fileRequested, files) {
  const fileFound = files.find((file) => file.name == fileRequested);
  const fileResult = fileFound ? fileFound.body : null;
  return fileResult;
}

function pathToCompiledFile(pathname) {
  return pathname.replace(/\//g, "").replace(/\.svelte$/, ".svelte.js");
}

// Initialize Polka
polka()
  .get("*", startTimer, svelteRenderHandler, logger)
  .post("*", startTimer, json({ limit: "50mb" }), svelteRenderHandler, logger)
  .listen(NODE_PORT, (err) => {
    if (err) console.error("error: ", err);
    console.log(
      `[node] Svelte SSR renderer listening in ${NODE_ENV} mode on port ${NODE_PORT}`
    );
  });
