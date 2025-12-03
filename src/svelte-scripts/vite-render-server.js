import { readdirSync, statSync, readFileSync } from "fs";
import { resolve, parse, join } from "path";
import { createServer as createViteServer } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Environment variables
const {
  NODE_ENV = "development",
  NODE_PORT = "4000",
  VITE_PORT = "5173",
  DEV_SECURE = "false",
  COMPONENT_DIR,
  LAYOUT_DIR,
  BUILD_DIR,
} = process.env;

const dev = NODE_ENV === "development" || NODE_ENV === "development_secure";
const devSecure = NODE_ENV === "development_secure" || DEV_SECURE === "true";
const devProtocol = devSecure ? "https" : "http";

// Shared Vite plugin configuration
function getSveltePlugin() {
  return svelte({
    compilerOptions: {
      dev,
    },
  });
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

// Initialize Vite server for development SSR
let vite = null;
if (dev) {
  vite = await createViteServer({
    root: COMPONENT_DIR,
    plugins: [getSveltePlugin()],
    server: { middlewareMode: true },
    appType: "custom",
    resolve: {
      dedupe: ["svelte"],
    },
    optimizeDeps: {
      exclude: ["svelte"],
    },
    ssr: {
      noExternal: ["svelte"],
    },
  });
}

const layoutFiles = loadLayoutFiles(LAYOUT_DIR);

// Collect CSS from a component and its imports by reading source files directly
async function collectComponentCss(vite, componentPath) {
  const allCss = [];
  const visited = new Set();

  async function getCssForComponent(svelteUrl) {
    // Request the CSS virtual module for this component
    const cssUrl = `${svelteUrl}?svelte&type=style&lang.css`;
    try {
      const result = await vite.transformRequest(cssUrl);
      if (result?.code) {
        // Vite wraps CSS in JS like: const __vite__css = "...css..."
        const match = result.code.match(/const __vite__css\s*=\s*"((?:[^"\\]|\\.)*)"/s);
        if (match) {
          return match[1]
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        }
      }
    } catch (e) {
      // Component might not have styles, that's ok
    }
    return '';
  }

  function getImportsFromSource(filePath) {
    // Read the source file directly and parse imports
    try {
      const source = readFileSync(filePath, 'utf-8');
      const imports = [];
      // Match import statements with .svelte files
      const importRegex = /import\s+[\w\s{},*]+\s+from\s+["']([^"']+\.svelte)["']/g;
      let match;
      while ((match = importRegex.exec(source)) !== null) {
        const importPath = match[1];
        const fileDir = resolve(filePath, '..');
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          imports.push(resolve(fileDir, importPath));
        } else if (importPath.startsWith('/')) {
          // Absolute path relative to Vite root
          imports.push(join(COMPONENT_DIR, importPath));
        }
      }
      return imports;
    } catch (e) {
      console.error(`[css-collect] Error reading imports from ${filePath}:`, e.message);
      return [];
    }
  }

  async function collectFromModule(modulePath) {
    const normalizedPath = modulePath.split('?')[0];
    if (visited.has(normalizedPath)) return;
    visited.add(normalizedPath);

    // If it's a Svelte component, get its CSS
    if (normalizedPath.endsWith('.svelte')) {
      const css = await getCssForComponent(normalizedPath);
      if (css) {
        allCss.push(css);
      }

      // Get imports from the source file
      const imports = getImportsFromSource(normalizedPath);

      for (const importPath of imports) {
        await collectFromModule(importPath);
      }
    }
  }

  await collectFromModule(componentPath);
  return allCss.join('\n');
}

// Generate client-side hydration script
function generateClientScript(pathname, context, isDev) {
  if (isDev) {
    return `
      <script type="module">
        // HMR setup - dynamic import for runtime URL construction
        const viteBase = '${devProtocol}://' + window.location.hostname + ':${VITE_PORT}';
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
    // Production: load from bundled assets
    return `
      <script type="module">
        import { hydrate } from 'svelte';

        const module = await import("/client${pathname.replace(/\.svelte$/, ".js")}");
        const App = module.default;

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
      const [componentModule, svelteModuleLoaded] = await Promise.all([
        import(ssrPath),
        import("svelte/server"),
      ]);
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

  // In dev mode, collect and inline CSS to prevent flash of unstyled content
  if (dev && vite) {
    try {
      const css = await collectComponentCss(vite, componentPath);
      if (css) {
        injectHead += `<style>${css}</style>`;
      }
    } catch (e) {
      console.error('[vite-ssr] Failed to collect CSS:', e.message);
    }
  }

  const clientScript = generateClientScript(pathname, context, dev);

  const html = layout
    .replace("<!-- CELESTITE HEAD -->", injectHead)
    .replace("<!-- CELESTITE BODY -->", ssr.body)
    .replace("<!-- CELESTITE CLIENT -->", clientScript);

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
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

    // Handle render requests
    const response = await handleRender(req);

    const duration = (performance.now() - start).toFixed(2);
    console.log(`[vite-ssr] ${req.method} ${url.pathname} ${response.status} - ${duration}ms`);

    return response;
  },
});

console.log(`[vite-ssr] Svelte SSR renderer listening in ${NODE_ENV} mode on port ${server.port}`);

// Also start Vite dev server for client HMR in development
if (dev) {
  // Start Vite's HTTP server for serving client assets with HMR
  const viteClientServer = await createViteServer({
    root: COMPONENT_DIR,
    plugins: [getSveltePlugin()],
    resolve: {
      dedupe: ["svelte"],
    },
    optimizeDeps: {
      exclude: ["svelte"],
    },
    server: {
      port: parseInt(VITE_PORT, 10),
      strictPort: true,
      https: devSecure,
      cors: true, // Allow cross-origin requests from the main app
    },
  });
  await viteClientServer.listen();
  console.log(`[vite-ssr] Vite dev server running on ${devProtocol}://localhost:${VITE_PORT}`);
}