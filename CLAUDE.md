# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Celestite is a Crystal library that enables server-side rendering (SSR) of Svelte 5 components. It spawns a Bun/Vite render server that handles SSR requests via HTTP, allowing Crystal web applications to use Svelte as their view layer.

## Commands

### Install Dependencies
```bash
shards install  # Installs Crystal deps and runs bun install via postinstall hook
```

### Run Tests
```bash
crystal spec                           # Run all tests
crystal spec spec/celestite_spec.cr    # Run specific test file
```

### Build for Production
```bash
# From svelte-scripts directory with proper env vars:
make build COMPONENT_DIR=/path/to/views BUILD_DIR=/path/to/public/celestite
```

### Development
The project is a shard (Crystal library) - no standalone run command. Tests spawn a Bun SSR server that must start within 20 seconds.

## Architecture

### Crystal Side (`src/celestite/`)
- **celestite.cr** - Main module entry point. Manages renderer lifecycle, handles SIGTERM for graceful shutdown.
- **renderer.cr** - Core SSR logic. Spawns Bun process via Make, communicates over HTTP to render components.
- **config.cr** - Configuration options: port (default 4000), vite_port (default 5173), env, component/layout/build directories, dev_secure (HTTPS mode), disable_a11y_warnings.
- **engine.cr** - Engine enum (currently only Svelte). Maps engines to their script directories.
- **amber.cr** - Framework adapters. Provides `celestite_render` macro for Amber and Kemal.

### Bun/Vite Side (`src/svelte-scripts/`)
- **vite-render-server.js** - Bun HTTP server using Vite for Svelte 5 SSR. Handles SSR with hydration support.
- **vite.config.js** - Vite configuration for production builds. Auto-discovers entry points from COMPONENT_DIR.
- **Makefile** - Launches render server with environment variables. Targets: `development`, `development_secure`, `staging`, `production`, `build`.

### Request Flow
1. Crystal app calls `Celestite.render(component, context)`
2. HTTP POST request sent to Bun server on configured port
3. Vite compiles and renders Svelte component (dev) or loads pre-built SSR module (production)
4. HTML returned with hydration script and CSS injected
5. Client-side hydration via Vite dev server (port 5173 in dev) or bundled assets (production)

### Key Configuration Options
```crystal
Celestite.initialize(
  engine: Celestite::Engine::Svelte,
  component_dir: "./src/views/",      # Svelte components
  build_dir: "./public/celestite/",   # Output for client bundles
  port: 4000,                         # Bun SSR server port
  vite_port: 5173,                    # Vite dev server port (development only)
  dev_secure: false,                  # Enable HTTPS mode
  disable_a11y_warnings: false        # Suppress Svelte a11y warnings
)
```

## Testing Notes

Tests start actual Bun processes. The `run_spec_server` helper in `spec/spec_helper.cr` handles server lifecycle with timeout handling. Tests wait for "SSR renderer listening" in output before proceeding.
