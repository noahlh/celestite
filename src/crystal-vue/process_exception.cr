class ProcessException < Exception
  def initialize(message, @errors : IO::Memory)
    super(message)
  end

  def inspect_with_backtrace
    String.build do |io|
      io.puts(self.message)
      @errors.rewind
      io.puts("-------------------------")
      io.puts(@errors.to_s)
    end
  end
end
