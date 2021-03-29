module Celestite
  class Config
    getter env : String
    getter port : Int32
    getter engine : Celestite::Engine
    getter component_dir : String?
    getter layout_dir : String?
    getter build_dir : String?

    def initialize(@env = "development", @port = 4000, @engine = Celestite::Engine::Svelte, @component_dir = nil, @layout_dir = nil, @build_dir = nil)
    end
  end
end
