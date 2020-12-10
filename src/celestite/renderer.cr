##
# The Renderer class does the heavy lifting of actually calling the node process to render
##

require "http/client"
require "log"
require "colorize"

module Celestite
  module Renderer
    @component_dir : String?
    @routes_file : String?
    @port : Int32
    @template_dir : String?
    @default_template : String?
    @build_dir : String?
    @build_dir_public_path : String?
    @client : HTTP::Client

    getter node_process : Process?
    getter errors : IO::Memory

    Log = ::Log.for("celestite".colorize(:light_green).to_s)

    def initialize(@component_dir = nil, @routes_file = nil, @port = 4000, @template_dir = nil, @default_template = nil, @build_dir = nil, @build_dir_public_path = nil)
      ENV["CELESTITE"] ||= "development"
      Log.info { "Renderer Initialized" }
      @client = HTTP::Client.new("localhost", @port)
      @errors = IO::Memory.new
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
      node_process = Process.new(@process_command, chdir: @engine.dir.to_s, shell: true, output: Process::Redirect::Pipe, error: Process::Redirect::Pipe)

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
      raise "Error - you must define component_dir to launch the node process" unless @component_dir
      Log.info { "Starting node server with command: #{@process_command}" }
      node_process = self.spawn_process
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
        Process.kill(Signal::TERM, pid.to_i)
      rescue ex
      end
    end

    def kill_server
      if node_process = @node_process
        Log.info { "Nuking node process #{node_process.pid}" }
        kill_process_tree(node_process.pid)
      end
    end

    def render(path : String?, context : Celestite::Context? = nil, template : String? = @default_template)
      Log.info { "Rendering #{path}" }
      Log.info { "Context: #{context.to_json}" }
      Log.info { "Template: #{template}" }

      path_with_query = String.build do |q|
        q << path
        q << "?template=#{template}" if template
      end

      method = (context || template) ? "POST" : "GET"
      headers = (method == "POST") ? HTTP::Headers{"content-type" => "application/json"} : nil

      Log.debug { "Calling node server:" }
      Log.debug { "Headers: #{headers}" }
      Log.debug { "#{method} #{path_with_query}" }

      response = @client.exec(method: method, path: path_with_query, headers: headers, body: context.to_json)

      Log.debug { "Response status: #{response.status}" }

      return response.body
    end

    class Generic
      include Renderer
    end

    class Svelte
      include Renderer

      def initialize(@component_dir = nil, @routes_file = nil, @port = 4000, @template_dir = nil, @default_template = nil, @build_dir = nil, @build_dir_public_path = nil)
        super
        @engine = Celestite::Engine::Svelte
        @process_command = String.build do |str|
          common_args = String.build do |args|
            args << "NODE_ENV=#{ENV["CELESTITE"]} "
            args << "NODE_PORT=#{port} " if @port
            args << "SAPPER_ROUTES=#{component_dir} " if @component_dir
            args << "SAPPER_BUILD_DIR=#{build_dir} " if @build_dir
          end
          str << "make -r " << ENV["CELESTITE"] << " "
          str << common_args
        end
      end
    end
  end
end
