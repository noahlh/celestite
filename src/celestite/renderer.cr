##
# The Renderer class does the heavy lifting of actually calling the node process to render
##

require "logger"
require "http/client"

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

    ##
    # You can pass in a logger to keep things neat & tidy (like with Amber).
    ##

    property logger : Logger

    def initialize(@component_dir = nil, @routes_file = nil, @logger = Logger.new(nil), @port = 4000, @template_dir = nil, @default_template = nil, @build_dir = nil, @build_dir_public_path = nil)
      ENV["CELESTITE"] ||= "development"
      @logger.info "Renderer Initialized"
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
            @logger.info(line)
          rescue
            @errors.puts("Stream error - process go bye bye :(")
          end
        end
      end

      spawn do
        while line = node_process.error.gets
          begin
            @logger.error(line)
            @errors.puts(line)
          rescue
            @errors.puts("Stream error - process go bye bye :(")
          end
        end
      end

      @logger.info "Renderer spawned process #{node_process.pid}"
      return node_process
    end

    def start_server
      raise "Error - you must define component_dir to launch the node process" unless @component_dir
      @logger.info("Starting node server with command: #{@process_command}")

      # retry_count = 0
      # while node_process = self.spawn_process
      #   sleep 1
      #   if (node_process.terminated? && retry_count < 3)
      #     @logger.info("Node process terminated.  Retrying...")
      #     retry_count += 1
      #   else
      #     break
      #   end
      # end
      # raise "Error - node process tried to start 3 times but failed" if node_process.terminated?
      node_process = self.spawn_process
      # raise "Error - node process failed to start" if node_process.terminated?
      @node_process = node_process
      return node_process
    end

    def kill_process_tree(pid : Int)
      begin
        io = IO::Memory.new
        # If pgrep is successful that this process has children
        if Process.run("pgrep", shell: false, args: ["-P", "#{pid}"], output: io).success?
          child_pids = io.to_s.split
          child_pids.each do |child_pid|
            kill_process_tree(child_pid.to_i)
          end
        end
        # No more children, so start killing from the bottom up
        @logger.info("Nuking child process #{pid}")
        Process.kill(Signal::TERM, pid.to_i)
      rescue ex
      end
    end

    def kill_server
      if node_process = @node_process
        @logger.info("Nuking node process #{node_process.pid}")
        kill_process_tree(node_process.pid)
      end
    end

    def render(path : String?, context : Celestite::Context? = nil, template : String? = @default_template)
      @logger.info "Rendering #{path}"
      @logger.info "Context: #{context}"
      @logger.info "Template: #{template}"

      path_with_query = String.build do |q|
        q << path
        q << "?template=#{template}" if template
      end

      method = (context || template) ? "POST" : "GET"
      headers = (method == "POST") ? HTTP::Headers{"content-type" => "application/json"} : nil

      response = @client.exec(method: method, path: path_with_query, headers: headers, body: context.to_json).body
    end

    class Generic
      include Renderer
    end

    class Vue
      include Renderer

      def initialize(@component_dir = nil, @routes_file = nil, @logger = Logger.new(nil), @port = 4000, @template_dir = nil, @default_template = nil, @build_dir = nil, @build_dir_public_path = nil)
        super
        @engine = Celestite::Engine::Vue
        @process_command = String.build do |str|
          common_args = String.build do |args|
            args << "NODE_ENV=#{ENV["CELESTITE"]} "
            args << "NODE_PORT=#{port} " if @port
            args << "VUE_TEMPLATE_DIR=#{template_dir} " if @template_dir
            args << "VUE_COMPONENT_DIR=#{component_dir} " if @component_dir
            args << "VUE_ROUTES_FILE=#{@routes_file} " if @routes_file
            args << "VUE_CLIENT_BUILD_DIR=#{build_dir} " if @build_dir
            args << "VUE_CLIENT_BUILD_DIR_PUBLIC_PATH=#{build_dir_public_path} " if @build_dir_public_path
          end
          str << "make -r " << ENV["CELESTITE"] << " "
          str << common_args
        end
      end

      def start_server
        raise "Error - you must define routes_file to launch the node process for Vue" unless @routes_file
        super
      end
    end

    class Svelte
      include Renderer

      def initialize(@component_dir = nil, @routes_file = nil, @logger = Logger.new(nil), @port = 4000, @template_dir = nil, @default_template = nil, @build_dir = nil, @build_dir_public_path = nil)
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
