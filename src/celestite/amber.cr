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

    module Kemal
      macro celestite_render(component = nil, context = nil, layout = nil)
        Celestite.render(component: {{ component }}, context: {{ context }}, layout: {{ layout }})
      end
    end
  end
end
