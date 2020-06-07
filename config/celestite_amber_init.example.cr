require "celestite"

ENV["CELESTITE"] = Amber.env.to_s

# Copy Amber logger settings, then change the color of our logger so it stands out

celestite_logger = Amber.settings.logger.dup
celestite_logger.progname = "Celestite"
celestite_logger.color = :green

# The main init...

Celestite.initialize(

  # #
  # # First, choose your engine.
  # # Vue (Celestite::Engine::Vue) & Svelte (Celestite::Engine::Svelte) are currently supported.
  # # Be sure to only use one of the below:
  # #

  # engine: Celestite::Engine::Vue,     # Uncomment this for Vue
  # engine: Celestite::Engine::Svelte,  # Uncomment this for Svelte

  # #
  # # This is the logger for the node processes to pipe stdout/stderr.  We initialized this up above.
  # #

  logger: celestite_logger,

  # #
  # # The component_dir defines where our .vue or .svelte components live.
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
  # # This should be "celestite/" for Vue and "/" for Svelte (this is because of subtleties in the
  # # underlying frameworks.  Not optimal.  Will be fixed / cleaned up in the future.)
  # #

  # build_dir_public_path: "celestite/",  # Uncomment this for Vue
  # build_dir_public_path: "/",           # Uncomment this for Svelte

  # #
  # # This is the port for the internal node server and defaults to 4000, but you can change it if you'd like!
  # #

  port: 4000,

  # #
  # # Vue-specific options below - remove these for Svelte.
  # #

  # #
  # # The routes_file is a small JSON object outlining our front-end routes.  Should match our server-side
  # # routes.  This will eventually be auto-generated since it's annoyingly redundant.
  # #

  routes_file: "#{Dir.current}/config/routes.js",

  # #
  # # If you're going to use custom templates, you'll need to specify where they live.
  # # Celestite will use a pretty straightforward default template otherwise.
  # #

  template_dir: "#{Dir.current}/src/views/layouts/",

  # #
  # # A default template to use if one is not specified in render calls.
  # #

  default_template: "main.html",
)
