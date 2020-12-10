require "spec"
require "../src/celestite"

ENV["CELESTITE"] = "test"

def run_spec_server(renderer, timeout = 20.seconds, output : IO? = IO::Memory.new)
  channel = Channel(Process).new

  IO.pipe do |reader, writer|
    multi = IO::MultiWriter.new(output, writer)
    io_log_backend = Log::IOBackend.new(multi)
    Log.setup(:debug, io_log_backend)

    now = Time.monotonic

    spawn do
      begin
        proc = renderer.start_server
        channel.send(proc)
      rescue
        Log.error { "Renderer failed to start." }
      end
    end

    begin
      proc = channel.receive
      loop do
        break if reader.gets =~ (/SSR renderer listening/)
        raise "Node server failed to start within timeout" if ((Time.monotonic - now) > timeout)
        raise "Node server failed" if proc.terminated?
        sleep 0.1
      end
      yield
    ensure
      renderer.kill_server
      Log.setup(:debug, Log::MemoryBackend.new)
    end
  end
end
