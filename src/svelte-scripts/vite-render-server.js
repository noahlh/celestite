import { readdirSync, statSync, readFileSync, existsSync, writeFileSync } from "fs";
import { resolve, parse, join } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Note: SSR bundles use absolute paths to celestite's svelte (configured in vite.config.js)
// This ensures renderer and SSR components share the same svelte instance for ssr_context

// Environment variables
const {
  NODE_ENV = "development",
  NODE_PORT = "4000",
  VITE_PORT = "5173",
  DEV_SECURE = "false",
  DEV_CLIENT_PROTOCOL,
  DEV_CLIENT_BASE,
  ROOT_DIR,
  COMPONENT_DIR,
  LAYOUT_DIR,
  BUILD_DIR,
  DISABLE_A11Y_WARNINGS = "false",
} = process.env;

const disableA11yWarnings = DISABLE_A11Y_WARNINGS === "true";
const bundledSvelteRoot = fileURLToPath(new URL("../../node_modules/svelte", import.meta.url));
const rootDir = ROOT_DIR || process.cwd();
const appSvelteRoot = resolve(rootDir, "node_modules", "svelte");
const runtimeSvelteRoot = existsSync(join(appSvelteRoot, "package.json"))
  ? appSvelteRoot
  : bundledSvelteRoot;
const svelteInternalClientCompatPath = join(runtimeSvelteRoot, "src/internal/client/celestite-compat.js");

// Development modes use Vite dev server; staging/production use pre-built assets
const dev = NODE_ENV === "development" || NODE_ENV === "development_secure";
const devSecure = NODE_ENV === "development_secure" || DEV_SECURE === "true";
const devProtocol = devSecure ? "https" : "http";
const devClientProtocol = DEV_CLIENT_PROTOCOL || devProtocol;
const devClientBase = DEV_CLIENT_BASE ? normalizeDevClientBase(DEV_CLIENT_BASE) : null;
// Staging mode uses production builds but with dev env vars loaded by Crystal
const isProductionBuild = !dev; // staging and production both use pre-built assets

// Load production manifest for asset resolution
let manifest = null;
if (!dev && BUILD_DIR) {
  const manifestPath = join(BUILD_DIR, "client", ".vite", "manifest.json");
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      console.log(`[vite-ssr] Loaded production manifest with ${Object.keys(manifest).length} entries`);
    } catch (e) {
      console.error(`[vite-ssr] Failed to load manifest: ${e.message}`);
    }
  } else {
    console.warn(`[vite-ssr] No manifest found at ${manifestPath} - run build first`);
  }
}

// Get manifest entry for a component
function getManifestEntry(pathname) {
  if (!manifest) return null;
  // Manifest keys include .svelte extension: "Home.svelte", "components/Modal.svelte"
  const entryKey = pathname.replace(/^\//, "");
  return manifest[entryKey] || null;
}

// Recursively collect CSS files from manifest entry and its imports
function collectCssFromManifest(entryKey, collected = new Set()) {
  if (!manifest || !manifest[entryKey]) return [];
  const entry = manifest[entryKey];

  // Add CSS from this entry
  if (entry.css) {
    entry.css.forEach((css) => collected.add(css));
  }

  // Recursively collect from imports
  if (entry.imports) {
    entry.imports.forEach((importKey) => {
      if (!collected.has(`visited:${importKey}`)) {
        collected.add(`visited:${importKey}`);
        collectCssFromManifest(importKey, collected);
      }
    });
  }

  // Filter out visited markers and return just CSS paths
  return Array.from(collected).filter((item) => !item.startsWith("visited:"));
}

// Shared Vite plugin configuration
function getSveltePlugin() {
  const options = {
    compilerOptions: {
      dev,
    },
  };

  // Optionally suppress a11y warnings for internal tools
  if (disableA11yWarnings) {
    options.onwarn = (warning, handler) => {
      if (warning.code && warning.code.startsWith("a11y_")) return;
      handler(warning);
    };
  }

  return svelte(options);
}

function ensureSvelteCompatFile() {
  const compatSource = `export * from "./index.js";
`;

  if (!existsSync(svelteInternalClientCompatPath) || readFileSync(svelteInternalClientCompatPath, "utf-8") !== compatSource) {
    writeFileSync(svelteInternalClientCompatPath, compatSource);
  }
}

function getSvelteResolveConfig(target = "client") {
  ensureSvelteCompatFile();

  const entrypoint = target === "server" ? "index-server.js" : "index-client.js";
  const legacyEntrypoint = target === "server" ? "legacy-server.js" : "legacy-client.js";

  return {
    alias: [
      { find: /^svelte$/, replacement: join(runtimeSvelteRoot, `src/${entrypoint}`) },
      { find: /^svelte\/internal\/client$/, replacement: svelteInternalClientCompatPath },
      { find: /^svelte\/internal\/client\/index\.js$/, replacement: svelteInternalClientCompatPath },
      { find: /^svelte\/store$/, replacement: join(runtimeSvelteRoot, `src/store/${entrypoint}`) },
      { find: /^svelte\/reactivity$/, replacement: join(runtimeSvelteRoot, `src/reactivity/${entrypoint}`) },
      { find: /^svelte\/legacy$/, replacement: join(runtimeSvelteRoot, `src/legacy/${legacyEntrypoint}`) },
      { find: /^svelte\/(.+)$/, replacement: `${join(runtimeSvelteRoot, "src")}/$1` },
    ],
    dedupe: ["svelte"],
  };
}

// Load layout files into memory
function loadLayoutFiles(dir) {
  if (!dir) return [];
  const files = [];
  try {
    readdirSync(dir).forEach((file) => {
      const filepath = resolve(dir, file);
      const stat = statSync(filepath);
      if (stat.isFile()) {
        const name = parse(file).name + parse(file).ext;
        const body = readFileSync(filepath, "utf-8");
        files.push({ name, body });
      }
    });
  } catch (e) {
    console.error(`[vite-ssr] Could not load layouts from ${dir}:`, e.message);
  }
  return files;
}

// Default layout if none specified
const DEFAULT_LAYOUT = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- CELESTITE HEAD -->
</head>
<body>
  <div id=celestite-app><!-- CELESTITE BODY --></div>
  <!-- CELESTITE CLIENT -->
</body>
</html>`;

function getLayout(layoutRequested, layouts) {
  if (!layoutRequested) {
    return DEFAULT_LAYOUT;
  }
  const found = layouts.find((f) => f.name === layoutRequested);
  return found ? found.body : DEFAULT_LAYOUT;
}

function parseUrl(reqURL) {
  const url = new URL(reqURL, "http://localhost");
  const pathname = url.pathname;
  const layoutRequested = url.searchParams.get("layout");
  return { pathname, layoutRequested };
}

function normalizeDevClientBase(base) {
  const trimmed = base.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withoutSlashes = trimmed.replace(/^\/+|\/+$/g, "");
  return `/${withoutSlashes}/`;
}

function getDevHttpsConfig() {
  if (!devSecure) return false;

  const rootDir = ROOT_DIR || process.cwd();
  const keyPath = resolve(rootDir, "dev.key");
  const certPath = resolve(rootDir, "dev.crt");

  if (!existsSync(keyPath) || !existsSync(certPath)) {
    throw new Error(
      `[vite-ssr] Secure development requires ${keyPath} and ${certPath}`,
    );
  }

  return {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
    allowHTTP1: true,
  };
}

const devHttpsConfig = getDevHttpsConfig();

// Initialize Vite server for development SSR
let vite = null;
if (dev) {
  vite = await createViteServer({
    root: COMPONENT_DIR,
    plugins: [getSveltePlugin()],
    server: { middlewareMode: true },
    appType: "custom",
    resolve: getSvelteResolveConfig("server"),
    optimizeDeps: {
      exclude: ["svelte"],
    },
    ssr: {
      noExternal: ["svelte"],
    },
  });
}

const layoutFiles = loadLayoutFiles(LAYOUT_DIR);

// CSS collection with caching for performance
// Caches are invalidated when Vite detects file changes via HMR
const cssCache = new Map(); // filePath -> css string
const importsCache = new Map(); // filePath -> array of import paths

// Clear caches when files change (Vite HMR)
if (dev && vite) {
  vite.watcher.on("change", (filePath) => {
    if (filePath.endsWith(".svelte")) {
      cssCache.delete(filePath);
      importsCache.delete(filePath);
    }
  });
}

async function collectComponentCss(componentPath) {
  const visited = new Set();

  async function getCssForComponent(svelteFilePath) {
    // Check cache first
    if (cssCache.has(svelteFilePath)) {
      return cssCache.get(svelteFilePath);
    }

    const cssUrl = `${svelteFilePath}?svelte&type=style&lang.css`;
    try {
      const result = await vite.transformRequest(cssUrl);
      if (result?.code) {
        let css = "";
        const viteMatch = result.code.match(/const __vite__css\s*=\s*"((?:[^"\\]|\\.)*)"/s);
        if (viteMatch) {
          css = viteMatch[1];
        } else {
          const exportMatch = result.code.match(/export default\s*"((?:[^"\\]|\\.)*)"/s);
          if (exportMatch) {
            css = exportMatch[1];
          }
        }
        if (css) {
          // Unescape the CSS string
          css = css
            .replace(/\\r/g, "") // Remove carriage returns
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");

          // Validate this is actually CSS, not component source
          // Vite returns full component source for styleless components
          const trimmed = css.trim();
          if (
            trimmed.startsWith("<") ||
            trimmed.startsWith("<!--") ||
            trimmed.includes("<script>") ||
            trimmed.includes("<svg")
          ) {
            // This is component markup, not CSS - skip it
            cssCache.set(svelteFilePath, "");
            return "";
          }

          cssCache.set(svelteFilePath, css);
          return css;
        }
      }
    } catch (e) {
      // Component might not have styles
    }
    cssCache.set(svelteFilePath, "");
    return "";
  }

  function getImportsFromSource(filePath) {
    // Check cache first
    if (importsCache.has(filePath)) {
      return importsCache.get(filePath);
    }

    try {
      const source = readFileSync(filePath, "utf-8");
      const imports = [];
      const importRegex = /import\s+[\w\s{},*]+\s+from\s+["']([^"']+\.svelte)["']/g;
      let match;
      while ((match = importRegex.exec(source)) !== null) {
        const importPath = match[1];
        const fileDir = resolve(filePath, "..");
        if (importPath.startsWith("./") || importPath.startsWith("../")) {
          imports.push(resolve(fileDir, importPath));
        } else if (importPath.startsWith("/")) {
          imports.push(join(COMPONENT_DIR, importPath));
        }
      }
      importsCache.set(filePath, imports);
      return imports;
    } catch (e) {
      importsCache.set(filePath, []);
      return [];
    }
  }

  // Collect all component paths first (synchronous, uses cached imports)
  function collectAllPaths(filePath) {
    const normalizedPath = filePath.split("?")[0];
    if (visited.has(normalizedPath)) return;
    visited.add(normalizedPath);

    if (normalizedPath.endsWith(".svelte")) {
      const imports = getImportsFromSource(normalizedPath);
      for (const importPath of imports) {
        collectAllPaths(importPath);
      }
    }
  }

  collectAllPaths(componentPath);

  // Fetch all CSS in parallel
  const cssResults = await Promise.all(Array.from(visited).map((path) => getCssForComponent(path)));

  return cssResults.filter((css) => css).join("\n");
}

// Find the svelte runtime entry in manifest
function findSvelteEntry() {
  if (!manifest) return null;
  // Look for the __svelte entry we created during build
  // The key is the source path, but the name is "__svelte"
  for (const entry of Object.values(manifest)) {
    if (entry.name === "__svelte" && entry.file) {
      return entry.file;
    }
  }
  return null;
}

// Generate client-side hydration script
function generateClientScript(pathname, context, isDev, manifestEntry) {
  if (isDev) {
    const viteBaseExpression = devClientBase && devClientBase !== "/"
      ? `window.location.origin + '${devClientBase.slice(0, -1)}'`
      : `'${devClientProtocol}://' + window.location.hostname + ':${VITE_PORT}'`;

    return `
      <script type="module">
        // HMR setup - dynamic import for runtime URL construction
        const viteBase = ${viteBaseExpression};
        await import(viteBase + '/@vite/client');

        // Load svelte and component through Vite dev server
        // Vite resolves bare specifiers via /@id/ prefix
        const { hydrate } = await import(viteBase + '/@id/svelte');
        const { default: App } = await import(viteBase + '${pathname}');

        hydrate(App, {
          target: document.querySelector("#celestite-app"),
          props: {
            context: ${JSON.stringify(context)}
          },
        });
      </script>
    `;
  } else {
    // Production: load from bundled assets using manifest
    const jsFile = manifestEntry?.file || pathname.replace(/^\//, "").replace(/\.svelte$/, ".js");
    const svelteFile = findSvelteEntry();

    if (!svelteFile) {
      console.error("[vite-ssr] No __svelte entry in manifest - client hydration will fail");
    }

    // Assets built to BUILD_DIR/client/ are served at /client/ by Kemal
    return `
      <script type="module">
        import { hydrate } from '/client/${svelteFile}';
        import App from '/client/${jsFile}';

        hydrate(App, {
          target: document.querySelector("#celestite-app"),
          props: {
            context: ${JSON.stringify(context)}
          },
        });
      </script>
    `;
  }
}

// Normalize component path
function normalizeComponentPath(pathname) {
  // Handle root path
  let normalized = pathname === "/" || pathname === "" ? "/index.svelte" : pathname;
  // Add .svelte extension if missing
  if (!normalized.endsWith(".svelte")) {
    normalized += ".svelte";
  }
  return normalized;
}

// SSR render handler
async function handleRender(req) {
  const { pathname: rawPathname, layoutRequested } = parseUrl(req.url);
  const pathname = normalizeComponentPath(rawPathname);
  const layout = getLayout(layoutRequested, layoutFiles);

  if (!layout) {
    return new Response(`Layout "${layoutRequested}" not found`, { status: 404 });
  }

  // Get context from request body (POST) or empty object (GET)
  let context = {};
  if (req.method === "POST") {
    try {
      context = await req.json();
    } catch (e) {
      console.error("[vite-ssr] Failed to parse request body:", e.message);
    }
  }

  let component;
  let render;
  let svelteModule;
  const componentPath = join(COMPONENT_DIR, pathname);

  try {
    if (dev && vite) {
      // Development: use Vite's SSR module loader for both component AND svelte
      // This ensures both use the same svelte instance
      const [componentModule, svelteModuleLoaded] = await Promise.all([
        vite.ssrLoadModule(componentPath),
        vite.ssrLoadModule("svelte/server"),
      ]);
      component = componentModule.default;
      svelteModule = svelteModuleLoaded;
      render = svelteModule.render;
    } else {
      // Production: load pre-built SSR module
      const ssrPath = join(BUILD_DIR, "server", pathname.replace(/\.svelte$/, ".js"));
      const [componentModule, svelteModuleLoaded] = await Promise.all([import(ssrPath), import("svelte/server")]);
      component = componentModule.default;
      svelteModule = svelteModuleLoaded;
      render = svelteModule.render;
    }
  } catch (error) {
    console.error(`[vite-ssr] Failed to load component ${pathname}:`, error.message);
    console.error(error.stack);
    return new Response(`Component load error: ${error.message}`, { status: 500 });
  }

  // Render the component using Svelte 5's render() function
  let ssr;
  try {
    ssr = render(component, { props: { context } });
  } catch (error) {
    console.error(`[vite-ssr] Failed to render ${pathname}:`, error.message);
    console.error(error.stack);
    return new Response(`Render error: ${error.message}`, { status: 500 });
  }

  // Build the response HTML
  let injectHead = ssr.head || "";

  // Get manifest entry for this component (production only)
  // Manifest keys include .svelte extension: "Coin.svelte", "components/Modal.svelte"
  const entryKey = pathname.replace(/^\//, "");
  const manifestEntry = getManifestEntry(pathname);

  if (dev && vite) {
    // Dev mode: collect and inline CSS to prevent flash of unstyled content
    try {
      const css = await collectComponentCss(componentPath);
      if (css) {
        injectHead += `<style>${css}</style>`;
      }
    } catch (e) {
      console.error("[vite-ssr] Failed to collect CSS:", e.message);
    }
  } else if (manifest) {
    // Production: inject CSS links from manifest
    // Assets built to BUILD_DIR/client/ are served at /client/ by Kemal
    const cssFiles = collectCssFromManifest(entryKey);
    for (const cssFile of cssFiles) {
      injectHead += `<link rel="stylesheet" href="/client/${cssFile}">`;
    }
  }

  const clientScript = generateClientScript(pathname, context, dev, manifestEntry);

  const html = layout
    .replace("<!-- CELESTITE HEAD -->", injectHead)
    .replace("<!-- CELESTITE BODY -->", ssr.body)
    .replace("<!-- CELESTITE CLIENT -->", clientScript);

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

// Memory management: run GC during idle periods to prevent memory accumulation
let idleGcTimer = null;
const IDLE_GC_DELAY_MS = 5000; // Run GC after 5 seconds of no requests
let requestsInFlight = 0;

function scheduleIdleGc() {
  // Clear any existing timer
  if (idleGcTimer) {
    clearTimeout(idleGcTimer);
    idleGcTimer = null;
  }

  // Only schedule GC in production and when no requests are in flight
  if (requestsInFlight > 0) return;

  idleGcTimer = setTimeout(() => {
    if (requestsInFlight === 0 && typeof Bun !== "undefined" && Bun.gc) {
      const before = process.memoryUsage();
      Bun.gc(true); // Synchronous full GC
      const after = process.memoryUsage();
      const freedMB = Math.round((before.heapUsed - after.heapUsed) / 1024 / 1024);
      console.log(`[vite-ssr] Idle GC freed ${freedMB}MB (heap: ${Math.round(after.heapUsed / 1024 / 1024)}MB)`);
    }
    idleGcTimer = null;
  }, IDLE_GC_DELAY_MS);
}

// Start Bun HTTP server
const server = Bun.serve({
  port: parseInt(NODE_PORT, 10),
  async fetch(req) {
    const start = performance.now();
    const url = new URL(req.url);

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }

    // Track requests in flight
    requestsInFlight++;

    // Handle render requests
    const response = await handleRender(req);

    const duration = (performance.now() - start).toFixed(2);
    console.log(`[vite-ssr] ${req.method} ${url.pathname} ${response.status} - ${duration}ms`);

    // Decrement and schedule GC when idle
    requestsInFlight--;
    scheduleIdleGc();

    return response;
  },
});

console.log(`[vite-ssr] Svelte SSR renderer listening in ${NODE_ENV} mode on port ${server.port}`);
if (isProductionBuild) {
  console.log(`[vite-ssr] Idle GC enabled: will run after ${IDLE_GC_DELAY_MS}ms of inactivity`);
}

// Also start Vite dev server for client HMR in development
if (dev) {
  // Start Vite's HTTP server for serving client assets with HMR
  const viteClientServer = await createViteServer({
    root: COMPONENT_DIR,
    base: devClientBase || "/",
    plugins: [getSveltePlugin()],
    resolve: getSvelteResolveConfig("client"),
    optimizeDeps: {
      exclude: ["svelte"],
    },
    server: {
      host: "0.0.0.0",
      port: parseInt(VITE_PORT, 10),
      strictPort: true,
      allowedHosts: true,
      https: devHttpsConfig,
      cors: true, // Allow cross-origin requests from the main app
    },
  });
  await viteClientServer.listen();
  console.log(`[vite-ssr] Vite dev server running on ${devProtocol}://localhost:${VITE_PORT}`);
}
