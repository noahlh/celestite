##
# The Renderer class does the heavy lifting of actually calling the node process to render
##

require "http/client"
require "log"
require "colorize"

module Celestite
  module Renderer
    getter config : Config
    getter node_process : Process?
    getter errors = IO::Memory.new

    Log = ::Log.for("celestite".colorize(:light_green).to_s)

    def initialize(@config = Config.new)
      Log.info { "Renderer Initialized" }
      @client = HTTP::Client.new("localhost", @config.port)
    end

    class Generic
      include Renderer
    end

    class Svelte
      include Renderer

      def initialize(@config : Config)
        super
        @process_command = String.build do |str|
          common_args = String.build do |args|
            args << "NODE_ENV=#{@config.env} "
            args << "NODE_PORT=#{@config.port} " if @config.port
            args << "COMPONENT_DIR=#{@config.component_dir} " if @config.component_dir
            args << "LAYOUT_DIR=#{@config.layout_dir} " if @config.layout_dir
            args << "BUILD_DIR=#{@config.build_dir} " if @config.build_dir
          end
          str << "make -r " << @config.env << " "
          str << common_args
        end
      end
    end

    ##
    # Starts up a node server and spawns two fibers to pipe both output & errors.
    #
    # Fibers take a bit of getting used to, but for more details, see:
    # https://crystal-lang.org/docs/guides/concurrency.html
    #
    # The key here is that the while loop + gets, as per the docs:
    # "...talk directly with the Runtime Scheduler and the Event Loop..."
    # "...the standard library already takes care of doing all of this so you don't have to."
    ##

    def spawn_process
      node_process = Process.new(@process_command, chdir: @config.engine.dir.to_s, shell: true, output: Process::Redirect::Pipe, error: Process::Redirect::Pipe)

      spawn do
        while line = node_process.output.gets
          begin
            Log.info { line }
          rescue
            @errors.puts("Stream error - process go bye bye :(")
          end
        end
      end

      spawn do
        while line = node_process.error.gets
          begin
            Log.error { line }
            @errors.puts(line)
          rescue
            @errors.puts("Stream error - process go bye bye :(")
          end
        end
      end

      Log.info { "Renderer spawned process #{node_process.pid}" }
      return node_process
    end

    def start_server
      Log.info { "Starting node server with command: #{@process_command}" }
      node_process = spawn_process
      @node_process = node_process
      return node_process
    end

    def kill_process_tree(pid : Int)
      begin
        io = IO::Memory.new
        # If pgrep is successful then this process has children
        if Process.run("pgrep", shell: false, args: ["-P", "#{pid}"], output: io).success?
          child_pids = io.to_s.split
          child_pids.each do |child_pid|
            kill_process_tree(child_pid.to_i)
          end
        end
        # No more children, so start killing from the bottom up
        Log.info { "Nuking child process #{pid}" }
        Process.signal(Signal::TERM, pid.to_i)
      rescue ex
      end
    end

    def kill_server
      if node_process = @node_process
        Log.info { "Nuking node process #{node_process.pid}" }
        kill_process_tree(node_process.pid)
      end
    end

    def render(component : String?, context : Celestite::Context? = nil, layout : String? = nil)
      Log.info { "Rendering #{component}" }
      Log.info { "Context: #{context.to_json}" }
      Log.info { "Layout: #{layout}" }

      path_with_query = String.build do |q|
        q << component
        q << "?layout=#{layout}" if layout
      end

      method = (context || layout) ? "POST" : "GET"
      headers = (method == "POST") ? HTTP::Headers{"content-type" => "application/json"} : nil

      Log.debug { "Calling node server:" }
      Log.debug { "Headers: #{headers}" }
      Log.debug { "#{method} #{path_with_query}" }

      response = @client.exec(method: method, path: path_with_query, headers: headers, body: context.to_json)

      Log.debug { "Response status: #{response.status}" }

      return response.body
    end
  end
end
