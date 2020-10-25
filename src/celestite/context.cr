require "json"

module Celestite
  # class Context < Hash(Symbol, (String | Int32 | Float64))
  #   def to_json
  #     string = JSON.build do |json|
  #       json.object do
  #         self.each do |k, v|
  #           json.field k, v
  #         end
  #       end
  #     end
  #   end
  # end

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
