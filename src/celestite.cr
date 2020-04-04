require "./celestite/*"
require "logger"

module Celestite
  # Keep track of any processes spawned
  @@node_processes : Array(Process) = [] of Process

  # Made available as class var so at_exit can log
  @@logger : Logger = Logger.new(nil)

  # Make an init'd renderer available on the module in cases where it's tough to pass the object (i.e. Amber)
  @@renderer : Renderer?

  # Store the default template in case #render is called without a template
  @@default_template : String?

  # CrystalVue.initialize does the full range of initialization (launches all processes) to get the renderer going
  def self.initialize(engine : Celestite::Engine, component_dir, routes_file = nil, logger = Logger.new(nil), port = 4000, template_dir = nil, @@default_template = nil, build_dir = nil, build_dir_public_path = nil) : Renderer
    @@logger = logger
    if engine == Celestite::Engine::Vue
      renderer = Celestite::Renderer::Vue.new(component_dir: component_dir, routes_file: routes_file, logger: logger, port: port, template_dir: template_dir, default_template: @@default_template, build_dir: build_dir, build_dir_public_path: build_dir_public_path)
    elsif engine == Celestite::Engine::Svelte
      renderer = Celestite::Renderer::Svelte.new(component_dir: component_dir, logger: logger, port: port, build_dir: build_dir, build_dir_public_path: build_dir_public_path)
    else
      raise "Engine must be defined - either Celestite::Engine::Vue or Celestite::Engine::Svelte"
    end
    @@node_processes << renderer.start_server
    @@renderer = renderer if renderer
    return renderer || Renderer::Generic.new
  end

  # This exposes the render class on the module, in cases (i.e. Amber) where you can't easily pass around the render instance.
  def self.render(path : String?, context : Celestite::Context? = nil, template : String? = @@default_template)
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

  # # Clean up after ourselves and nuke any spun up node processe
  # def self.kill_process_tree(pid : Int)
  #   begin
  #     io = IO::Memory.new
  #     # If pgrep is successful that this process has children
  #     if Process.run("pgrep", args: ["-P #{pid}"], output: io).success?
  #       child_pids = io.to_s.split
  #       child_pids.each do |child_pid|
  #         self.kill_process_tree(child_pid.to_i)
  #       end
  #     end
  #     # No more children, so start killing from the bottom up
  #     @@logger.info("Nuking child process #{pid}")
  #     Process.kill(Signal::TERM, pid.to_i)
  #   rescue ex
  #   end
  # end

  # def self.kill_processes
  #   if @@node_processes.size > 0
  #     @@node_processes.each do |process|
  #       @@logger.info("Nuking node process #{process.pid}")
  #       self.kill_process_tree(process.pid)
  #     end
  #     @@node_processes.clear
  #   end
  # end

  # Kill off the node processes when the program exits or receives a SIGTERM (i.e. Amber watch restart)
  at_exit do
    if renderer = self.renderer
      renderer.kill_server
    end
  end

  Signal::TERM.trap do
    if renderer = self.renderer
      renderer.kill_server
      exit
    end
  end
end
