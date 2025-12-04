![](https://github.com/noahlh/celestite/workflows/crystal%20spec/badge.svg?branch=master)

# celestite

<img src="https://crystal-lang.org/assets/media/crystal_icon.svg?sanitize=1" height=21> Crystal + <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Svelte_Logo.svg" height=16> Svelte 5 = :zap:

Celestite allows you to use the full power of [Svelte 5](https://svelte.dev) reactive components in your [Crystal](https://crystal-lang.org) web apps. It's a drop-in replacement for your view layer -- no more need for intermediate `.ecr` templates. With celestite, you write your backend server code in Crystal, your frontend client code in JavaScript & HTML, and everything works together seamlessly...and fast.

## Introduction

[Read the full introductory blog post here.](https://nlh.me/projects/celestite)

### Requirements

- Crystal 1.0.0+
- Bun 1.0+ (for the SSR render server)

## Installation

Celestite has been developed and tested with the [Amber](https://amberframework.org) web framework, but designed to work standalone as well. It also works with [Kemal](http://kemalcr.com/) and other Crystal web frameworks.

### 1. Add celestite to your application's `shard.yml` and run `shards install`

```yaml
dependencies:
  celestite:
    github: noahlh/celestite
    version: ~> 0.2.0
```

The postinstall hook will automatically install JavaScript dependencies via Bun.

### 2. Include the helper in your controller

For Amber:
```crystal
# application_controller.cr

class ApplicationController < Amber::Controller::Base
  include Celestite::Adapter::Amber
end
```

For Kemal:
```crystal
require "celestite"
include Celestite::Adapter::Kemal
```

### 3. Add initialization code

Create an initializer file (e.g., `/config/initializers/celestite.cr`):

```crystal
require "celestite"

Celestite.initialize(
  engine: Celestite::Engine::Svelte,
  component_dir: "#{Dir.current}/src/views/",
  build_dir: "#{Dir.current}/public/celestite/",
  port: 4000,
  vite_port: 5173,
)
```

[See example config](/config/celestite_amber_init.example.cr) for more options.

### 4. Add a static route for your build_dir

For Amber:
```crystal
# routes.cr

pipeline :static do
  plug Amber::Pipe::Error.new
  plug Amber::Pipe::Static.new("./public")
  plug Amber::Pipe::Static.new("./public/celestite")
end
```

### 5. Add your `.svelte` files and start building!

Name your root component `index.svelte` (all lowercase).

## Usage

### celestite_render

```crystal
celestite_render(component : String?, context : Celestite::Context?, layout : String?)
```

Call this where you'd normally call `render` in your controllers.

- `component` - The Svelte component to render (without `.svelte` extension)
- `context` - A `Celestite::Context` hash with data to pass to your component
- `layout` - Optional HTML layout file from your layout_dir

### Example Controller

```crystal
class HomeController < ApplicationController
  def index
    data = 1 + 1
    context = Celestite::Context{:data => data}
    celestite_render("Home", context)
  end
end
```

### Accessing Context in Svelte

```svelte
<script>
  let { context } = $props();
</script>

<h1>Result: {context.data}</h1>
```

## Server vs Client Rendering

Your `.svelte` components are automatically rendered server-side before being sent to the client, then hydrated on the client for interactivity.

Code that relies on browser-specific APIs (like `document` or `window`) must be wrapped in Svelte's `onMount()`:

```svelte
<script>
  import { onMount } from 'svelte';

  onMount(() => {
    // Browser-only code here
    console.log(window.location);
  });
</script>
```

## HTTPS/SSL Support for Development

Celestite supports running the Vite dev server over HTTPS, useful for tunneled connections (ngrok, localtunnel, etc.).

### Setup

1. Install mkcert:
   ```bash
   brew install mkcert  # macOS
   ```

2. Install the local CA:
   ```bash
   sudo mkcert -install
   ```

3. Generate certificates:
   ```bash
   mkcert -key-file dev.key -cert-file dev.crt localhost 127.0.0.1 ::1
   ```

4. Enable in configuration:
   ```crystal
   Celestite.initialize(
     dev_secure: true,
     # ... other config
   )
   ```

## Production Builds

For production, Svelte components must be pre-built using Vite.

### Building

From your app's root directory:

```bash
# Build client bundles
COMPONENT_DIR=/path/to/views BUILD_DIR=/path/to/public/celestite \
  bunx --bun vite build --config /path/to/lib/celestite/vite.config.js

# Build SSR bundles
COMPONENT_DIR=/path/to/views BUILD_DIR=/path/to/public/celestite \
  bunx --bun vite build --config /path/to/lib/celestite/vite.config.js --ssr
```

Or use the Makefile target:
```bash
cd /path/to/lib/celestite/src/svelte-scripts
make build COMPONENT_DIR=/path/to/views BUILD_DIR=/path/to/public/celestite
```

### Build Output

- `BUILD_DIR/client/` - Client-side JS/CSS with content hashes
- `BUILD_DIR/client/.vite/manifest.json` - Asset manifest for hydration
- `BUILD_DIR/server/` - SSR modules for server-side rendering

### Testing Production Builds Locally

```bash
NODE_ENV=production NODE_PORT=4000 \
  COMPONENT_DIR=/path/to/views \
  LAYOUT_DIR=/path/to/views/layouts \
  BUILD_DIR=/path/to/public/celestite \
  bun run /path/to/lib/celestite/src/svelte-scripts/vite-render-server.js
```

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `engine` | `Svelte` | Rendering engine (currently only Svelte) |
| `component_dir` | - | Path to your Svelte components |
| `layout_dir` | - | Path to HTML layout templates |
| `build_dir` | - | Output directory for production builds |
| `port` | `4000` | Bun SSR server port |
| `vite_port` | `5173` | Vite dev server port (development only) |
| `dev_secure` | `false` | Enable HTTPS for dev server |
| `disable_a11y_warnings` | `false` | Suppress Svelte accessibility warnings |

## Roadmap

- [x] Svelte 5 support with Vite
- [x] Hot Module Reloading (HMR)
- [x] Production builds with content hashing
- [ ] SvelteKit integration
- [ ] Example/demo project

## Contributing

Contributions are welcome! This is an open source project and feedback, bug reports, and PRs are appreciated.

1. Fork it (<https://github.com/noahlh/celestite/fork>)
2. Create your feature branch (`git checkout -b my-feature`)
3. Write tests!
4. Commit your changes (`git commit -am 'Add feature'`)
5. Push to the branch (`git push origin my-feature`)
6. Create a Pull Request

## Contributors

- Noah Lehmann-Haupt (nlh@nlh.me / [noahlh](https://github.com/noahlh)) - creator, maintainer
