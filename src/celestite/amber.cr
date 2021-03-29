module Celestite
  module Adapter
    module Amber
      macro celestite_render(component = nil, context = nil, layout = nil)
        {% if layout %}
          Celestite.render(component: {{ component }}, context: {{ context }}, layout: {{ layout }})
        {% else %}
          Celestite.render(component: {{ component }}, context: {{ context }})
        {% end %}
      end
    end
  end
end
