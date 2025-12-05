require "./celestite/*"

module Celestite
  # Make an init'd renderer available on the module in cases where it's tough to pass the object (i.e. Amber)
  class_getter renderer : Renderer?

  # Keep track of any processes spawned
  @@node_processes : Array(Process) = [] of Process

  # Celestite.initialize does the full range of initialization (launches all processes) to get the renderer going
  def self.initialize(**options) : Renderer
    config = Config.new(**options)
    renderer = config.engine.renderer.new(config)
    @@node_processes << renderer.start_server
    @@renderer = renderer if renderer
    return renderer || Renderer::Generic.new
  end

  # This exposes the render class on the module, in cases (i.e. Amber) where you can't easily pass around the render instance.
  def self.render(component : String?, context : Celestite::Context? = nil, layout : String? = nil)
    if renderer = @@renderer
      if proc = renderer.node_process
        raise ProcessException.new("Error rendering - node process is dead", renderer.errors) if proc.terminated?
        renderer.render(component, context, layout)
      end
    end
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
