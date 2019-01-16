require "json"

module CrystalVue
  class Context < Hash(Symbol, (String | Int32 | Float64))
    def to_json
      string = JSON.build do |json|
        json.object do
          self.each do |k, v|
            json.field k, v
          end
        end
      end
    end
  end
end
