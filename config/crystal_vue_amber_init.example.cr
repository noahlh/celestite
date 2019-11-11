require "crystal-vue"

# Setup the environment.  In development, Crystal-vue uses webpack.watch() to auto-rebuild the
# SSR bundle & client manifest when any of the components change.  In production, it calls
# webpack.run() once to build the files.

ENV["CRYSTAL_VUE"] = Amber.env.to_s

# Copy Amber logger settings, then change the color of our logger so it stands out

crystal_vue_logger = Amber.settings.logger.dup
crystal_vue_logger.progname = "Vue SSR"
crystal_vue_logger.color = :green

# The main init...

CrystalVue.init(
  # logger - optional; A Logger for the node processes to pipe stdout/stderr.  We set this up above.
  logger: crystal_vue_logger,

  # component_dir - required;  Where our .vue components live
  component_dir: "#{Dir.current}/src/views/",

  # routes_file - required;  A small JSON object outlining our front-end routes.  Should match our server-side
  # routes.  This will eventually be auto-generated (coming soon!) since it's annoyingly redundant.
  routes_file: "#{Dir.current}/config/routes.js",

  # port - optional;  Choose the port that we'll use to communicate with the node process.  Defaults to 4000.
  port: 4000,

  # template_dir - optional;  If you're going to use custom templates, you'll need to specify where they live.
  # otherwise crystal-vue will use a pretty straightforward default template.
  template_dir: "#{Dir.current}/src/views/layouts/",

  # default_template - optional;  A default template to use if one is not specified in render calls
  default_template: "main.html",

  # build_dir - optional (but basically required if you want client-side JavaScript to work);  Where the crystal-vue
  # webpack process should output the client-side javascript bundle build.  This file will be called by browsers
  # directly, so it should live where your other static files live. For now this will be a symbolic link.
  build_dir: "#{Dir.current}/public/crystal-vue-js/",

  # build_dir_public_path - related to above, this is the relative directory the browser should reference for the
  # client js build file.
  build_dir_public_path: "crystal-vue-js/"
)
