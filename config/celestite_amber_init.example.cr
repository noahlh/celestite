require "celestite"

ENV["CELESTITE"] = Amber.env.to_s

Celestite.initialize(

  # #
  # # First, choose your engine.  Although for the moment, it isn't much of a choice.
  # # Vue (Celestite::Engine::Vue) & Svelte (Celestite::Engine::Svelte) were originally supported,
  # # but we're focusing on Svelte for the time being.
  # #

  engine: Celestite::Engine::Svelte,

  # #
  # # The component_dir defines where our .svelte components live.
  # #

  component_dir: "#{Dir.current}/src/views/",

  # #
  # # build_dir - required;  Where the celestite build process should output the client-side javascript bundle build.
  # # This file will be called by browsers directly, so it should live where your other static files live.
  # # For now this will be a symbolic link.
  # #

  build_dir: "#{Dir.current}/public/celestite/",

  # #
  # # The build_dir_public_path is the relative directory the browser references for the client js build file.
  # # This should be /" for Svelte (this is because of subtleties in the underlying frameworks.)  Not optimal.
  # # Will be fixed / cleaned up in the future.
  # #

  build_dir_public_path: "/", #

  # #
  # # This is the port for the internal node server and defaults to 4000, but you can change it if you'd like!
  # #

  port: 4000,
)
