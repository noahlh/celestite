require "celestite"

env = ENV["ENV"] || "development"

Celestite.initialize(
  env: env,                                       # The env defines the environment we're running in (development, production, etc.).
  engine: Celestite::Engine::Svelte,              # Currently only Svelte is supported.
  root_dir: "#{Dir.current}",                     # The root_dir defines where our project root is.
  component_dir: "#{Dir.current}/src/views",      # The component_dir defines where our .svelte components live.
  layout_dir: "#{Dir.current}/src/views/layouts", # The layout_dir defines where our Svelte layouts live
  build_dir: "#{Dir.current}/public/celestite",   # The build_dir defines where the celestite build process outputs the client-side bundles.
  port: 4000,                                     # The port for the internal Bun SSR server (defaults to 4000)
  vite_port: 5173,                                # The port for the Vite dev server (defaults to 5173, only used in development)
  dev_secure: false,                              # Whether to run the Vite dev server over HTTPS (defaults to false)
  disable_a11y_warnings: true                     # Optionally suppress accessibility warnings (defaults to false)
)
