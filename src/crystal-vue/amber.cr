module CrystalVue
  module Adapter
    module Amber
      macro included
        @vue_context = CrystalVue::Context.new
      end

      macro vue_render(vue_context = nil, path = nil, template = nil)
        {% if template %}
          CrystalVue.render(path: ({{ path }} || request.resource), context: {{ vue_context }}, template: {{ template }})
        {% else %}
          CrystalVue.render(path: ({{ path }} || request.resource), context: {{ vue_context }})
        {% end %}
      end
    end
  end
end
