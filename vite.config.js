import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { readdirSync, statSync } from "fs";
import { resolve, relative, dirname } from "path";
import { fileURLToPath } from "url";

// Get celestite's root directory (where vite.config.js is located)
const __dirname = dirname(fileURLToPath(import.meta.url));
const celestiteSveltePath = resolve(__dirname, "node_modules/svelte");

// This config is used for production builds
// Runtime dev configuration is handled programmatically in vite-render-server.js

// Recursively find all .svelte files for multi-entry builds
function findSvelteFiles(dir, files = []) {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = resolve(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        // Skip layouts directory - those are HTML templates, not components
        if (entry !== "layouts") {
          findSvelteFiles(fullPath, files);
        }
      } else if (entry.endsWith(".svelte")) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // Directory might not exist
  }
  return files;
}

// Create entry points object for Vite rollup input
function createEntryPoints(componentDir, isSsrBuild) {
  if (!componentDir) return {};
  const files = findSvelteFiles(componentDir);
  const entries = {};
  for (const file of files) {
    const relPath = relative(componentDir, file);
    const entryName = relPath.replace(/\.svelte$/, "");
    entries[entryName] = file;
  }
  // For client builds, add a svelte runtime entry for hydration
  if (!isSsrBuild) {
    entries["__svelte"] = "svelte";
  }
  return entries;
}

export default defineConfig(({ command, isSsrBuild }) => {
  const isDev = command === "serve";
  const componentDir = process.env.COMPONENT_DIR;
  const buildDir = process.env.BUILD_DIR;

  const entries = componentDir ? createEntryPoints(componentDir, isSsrBuild) : {};

  return {
    root: componentDir || process.cwd(),
    plugins: [
      svelte({
        compilerOptions: {
          dev: isDev,
          ...(isSsrBuild ? { generate: "server" } : {}),
        },
      }),
    ],
    build: {
      outDir: buildDir
        ? isSsrBuild
          ? `${buildDir}/server`
          : `${buildDir}/client`
        : "dist",
      emptyOutDir: true,
      // Generate manifest for production asset resolution
      manifest: !isSsrBuild,
      ssrManifest: !isSsrBuild,
      rollupOptions: {
        input: Object.keys(entries).length > 0 ? entries : undefined,
        output: isSsrBuild
          ? {
              entryFileNames: "[name].js",
              chunkFileNames: "chunks/[name].js",
              // Rewrite external svelte imports to absolute paths pointing to celestite's svelte
              // This ensures SSR bundles use the same svelte instance as the renderer
              paths: {
                "svelte": resolve(celestiteSveltePath, "src/index-server.js"),
                "svelte/server": resolve(celestiteSveltePath, "src/server/index.js"),
                "svelte/internal": resolve(celestiteSveltePath, "src/internal/index.js"),
                "svelte/internal/server": resolve(celestiteSveltePath, "src/internal/server/index.js"),
              },
            }
          : {
              entryFileNames: "[name]-[hash].js",
              chunkFileNames: "chunks/[name]-[hash].js",
              assetFileNames: "assets/[name]-[hash][extname]",
            },
        // Preserve entry point exports for hydration
        preserveEntrySignatures: "exports-only",
      },
      minify: isSsrBuild ? false : "esbuild",
      // Disable sourcemaps - Rolldown has issues with Svelte sourcemaps
      sourcemap: false,
    },
    ssr: {
      // For SSR builds, keep svelte external so lifecycle functions share the same context
      // For dev, we use noExternal in vite-render-server.js
      external: isSsrBuild ? ["svelte", "svelte/server", "svelte/internal", "svelte/internal/server"] : [],
    },
    resolve: {
      dedupe: ["svelte"],
      // Note: For SSR builds, svelte is kept external (not aliased) so bare specifier imports
      // remain in the output. At runtime, vite-render-server.js handles resolving these
      // to celestite's svelte package so renderer and components share the same ssr_context.
    },
  };
});