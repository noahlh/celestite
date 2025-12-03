# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Celestite is a Crystal library that enables server-side rendering (SSR) of Svelte components. It spawns a Node.js render server that handles SSR requests via HTTP, allowing Crystal web applications to use Svelte as their view layer.

## Commands

### Install Dependencies
```bash
shards install  # Installs Crystal deps and runs npm install via postinstall hook
```

### Run Tests
```bash
crystal spec                           # Run all tests
crystal spec spec/celestite_spec.cr    # Run specific test file
```

### Development
The project is a shard (Crystal library) - no standalone run command. Tests spawn a Node.js SSR server that must start within 20 seconds.

## Architecture

### Crystal Side (`src/celestite/`)
- **celestite.cr** - Main module entry point. Manages renderer lifecycle, handles SIGTERM for graceful shutdown.
- **renderer.cr** - Core SSR logic. Spawns Node process via Make, communicates over HTTP to render components.
- **config.cr** - Configuration options: port (default 4000), snowpack_port (default 8080), env, component/layout/build directories, dev_secure (HTTPS mode).
- **engine.cr** - Engine enum (currently only Svelte). Maps engines to their script directories.
- **amber.cr** - Framework adapters. Provides `celestite_render` macro for Amber and Kemal.

### Node Side (`src/svelte-scripts/`)
- **svelte-render-server.js** - Polka HTTP server using Snowpack for Svelte compilation. Handles SSR with hydration support.
- **Makefile** - Launches render server with environment variables. Targets: `development`, `development_secure`, `production`.

### Request Flow
1. Crystal app calls `Celestite.render(component, context)`
2. HTTP request sent to Node server on configured port
3. Snowpack compiles and renders Svelte component
4. HTML returned with hydration script injected
5. Client-side hydration via Snowpack dev server (port 8080 by default)

### Key Configuration Options
```crystal
Celestite.initialize(
  engine: Celestite::Engine::Svelte,
  component_dir: "./src/views/",      # Svelte components
  build_dir: "./public/celestite/",   # Output for client bundles
  port: 4000,                         # Node SSR server port
  snowpack_port: 8080,                # Snowpack dev server port
  dev_secure: false                   # Enable HTTPS mode
)
```

## Testing Notes

Tests start actual Node processes. The `run_spec_server` helper in `spec/spec_helper.cr` handles server lifecycle with timeout handling. Tests wait for "SSR renderer listening" in output before proceeding.
