module Celestite
  module Adapter
    module Amber
      macro celestite_render(context = nil, path = nil, template = nil)
        {% if template %}
          Celestite.render(path: ({{ path }} || request.resource), context: {{ context }}, template: {{ template }})
        {% else %}
          Celestite.render(path: ({{ path }} || request.resource), context: {{ context }})
        {% end %}
      end
    end
  end
end
