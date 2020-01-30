module Celestite
  module Adapter
    module Amber
      macro included
        # These are the same thing - an object with some initial state for server-side rendering.
        # But in Vue it's called a context and in Svelte/Sapper it's called the session store, 
        # So we'll name them accordingly here for consistency.
        
        @vue_context = Celestite::Context.new
        @sapper_session = Celestite::Context.new
      end

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
