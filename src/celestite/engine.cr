module Celestite
  enum Engine
    Svelte

    @@dirs = {
      Svelte => "svelte-scripts",
    }

    @@renderer = {
      Svelte => Celestite::Renderer::Svelte,
    }

    def dir
      Path.new(__DIR__, "../#{@@dirs[self]}").normalize
    end

    def renderer
      @@renderer[self]
    end

    def make_clean!
      Process.run("make clean", shell: true, chdir: self.dir.to_s)
    end
  end
end
