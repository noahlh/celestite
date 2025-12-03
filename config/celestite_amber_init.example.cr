require "celestite"

ENV["CELESTITE"] = Amber.env.to_s

Celestite.initialize(

  # #
  # # First, choose your engine. Currently only Svelte is supported.
  # #

  engine: Celestite::Engine::Svelte,

  # #
  # # The component_dir defines where our .svelte components live.
  # #

  component_dir: "#{Dir.current}/src/views/",

  # #
  # # build_dir - required; Where the celestite build process outputs the client-side bundles.
  # # This should be accessible to browsers, typically in your public/static directory.
  # #

  build_dir: "#{Dir.current}/public/celestite/",

  # #
  # # Port for the internal Bun SSR server (defaults to 4000)
  # #

  port: 4000,

  # #
  # # Port for the Vite dev server (defaults to 5173, only used in development)
  # #

  vite_port: 5173,
)
