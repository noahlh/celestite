import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// This config is used by the build scripts in package.json
// Runtime configuration is handled programmatically in vite-render-server.js

export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    plugins: [
      svelte({
        compilerOptions: {
          hydratable: true,
          dev: isDev,
        },
      }),
    ],
    build: {
      // Production builds get proper bundling with hashing
      rollupOptions: {
        output: {
          // Content-hashed filenames for cache busting
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
      // Enable minification and tree-shaking
      minify: "esbuild",
      // Generate source maps for debugging
      sourcemap: isDev,
    },
    // SSR-specific options
    ssr: {
      // Externalize deps that shouldn't be bundled for SSR
      noExternal: ["svelte"],
    },
  };
});