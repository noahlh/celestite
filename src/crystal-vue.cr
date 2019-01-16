require "./crystal-vue/*"
require "logger"

module CrystalVue
  # Keep track of any processes spawned
  @@node_processes : Array(Process) = [] of Process

  # Made available as class var so at_exit can log
  @@logger : Logger = Logger.new(nil)

  # Make an init'd renderer available on the module in cases where it's tough to pass the object (i.e. Amber)
  @@renderer : Renderer?

  # Store the default template in case #render is called without a template
  @@default_template : String?

  # CrystalVue.init does the full range of initialization (launches all processes) to get the renderer going
  def self.init(component_dir, routes_file, logger = Logger.new(nil), port = 4000, template_dir = nil, @@default_template = nil, build_dir = nil, build_dir_public_path = nil)
    @@logger = logger
    renderer = Renderer.new(component_dir: component_dir, routes_file: routes_file, logger: logger, port: port, template_dir: template_dir, default_template: @@default_template, build_dir: build_dir, build_dir_public_path: build_dir_public_path)
    @@node_processes << renderer.start_server
    @@renderer = renderer if renderer
  end

  # This exposes the render class on the module, in cases (i.e. Amber) where you can't easily pass around the render instance.
  def self.render(path : String?, context : CrystalVue::Context? = nil, template : String? = @@default_template)
    if renderer = @@renderer
      if proc = renderer.node_process
        raise ProcessException.new("Error rendering - node process is dead", renderer.errors) if proc.terminated?
        renderer.render(path, context, template)
      end
    end
  end

  # This might be replaceable with a 'getter' - can you do that for class vars?
  def self.renderer
    @@renderer
  end

  # Clean up after ourselves and nuke any spun up node processes
  def self.kill_processes
    if @@node_processes.size > 0
      @@node_processes.each do |process|
        @@logger.info("Nuking node process #{process.pid}")
        begin
          process.kill unless process.terminated?
        rescue ex
        end
      end
      @@node_processes.clear
    end
  end

  # Kill off the node processes when the program exits or receives a SIGTERM (i.e. Amber watch restart)
  at_exit do
    self.kill_processes
  end

  Signal::TERM.trap do
    self.kill_processes
    exit
  end
end
