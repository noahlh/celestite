require "json"

module Celestite
  class Context(K, V)
    def initialize
      @_hash = {} of K => V
    end

    def []=(key, value)
      @_hash[key] = value
    end

    def to_json
      @_hash.to_json
    end
  end
end
