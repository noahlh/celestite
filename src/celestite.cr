require "./celestite/*"

module Celestite
  # Keep track of any processes spawned
  @@node_processes : Array(Process) = [] of Process

  # Make an init'd renderer available on the module in cases where it's tough to pass the object (i.e. Amber)
  @@renderer : Renderer?

  # Store the default template in case #render is called without a template
  @@default_template : String?

  # Celestite.initialize does the full range of initialization (launches all processes) to get the renderer going
  def self.initialize(engine : Celestite::Engine, component_dir, routes_file = nil, port = 4000, template_dir = nil, @@default_template = nil, build_dir = nil, build_dir_public_path = nil) : Renderer
    if engine == Celestite::Engine::Svelte
      renderer = Celestite::Renderer::Svelte.new(component_dir: component_dir, port: port, build_dir: build_dir, build_dir_public_path: build_dir_public_path)
    else
      raise "Engine must be defined - Celestite::Engine::Svelte (for now)"
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
