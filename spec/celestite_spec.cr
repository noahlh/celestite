require "./spec_helper"
require "./renderer/**"
require "./support/**"

describe Celestite do
  describe "self.init" do
    it "returns a Vue Renderer when called with no arguments" do
      renderer = Celestite.initialize(
        engine: Celestite::Engine::Vue,
        routes_file: "#{__DIR__}/scripts/vue/routes.js",
        component_dir: "#{__DIR__}/scripts/vue"
      )
      renderer.should be_a(Celestite::Renderer)
    ensure
      renderer.kill_server if renderer
    end
    it "returns a Svelte Renderer when called with no arguments" do
      renderer = Celestite.initialize(
        engine: Celestite::Engine::Svelte,
        component_dir: "#{__DIR__}/scripts/svelte"
      )
      renderer.should be_a(Celestite::Renderer)
    ensure
      renderer.kill_server if renderer
    end
  end
  describe "@@renderer" do
    it "should store a renderer in the module/class var" do
      renderer = Celestite.initialize(
        engine: Celestite::Engine::Vue,
        routes_file: "#{__DIR__}/scripts/vue/routes.js",
        component_dir: "#{__DIR__}/scripts/vue"
      )
      Celestite.renderer.should be_a(Celestite::Renderer)
    ensure
      renderer.kill_server if renderer
    end
    it "both returns & stores an init'd renderer in a class/module variable" do
      renderer = Celestite.initialize(
        engine: Celestite::Engine::Vue,
        routes_file: "#{__DIR__}/scripts/vue/routes.js",
        component_dir: "#{__DIR__}/scripts/vue"
      )
      renderer.should eq(Celestite.renderer)
    ensure
      renderer.kill_server if renderer
    end
  end
  describe "self.render" do
    describe "Vue" do
      it "renders a template (called from the module-level)" do
        renderer = Celestite.initialize(
          engine: Celestite::Engine::Vue,
          routes_file: "#{__DIR__}/scripts/vue/routes.js",
          component_dir: "#{__DIR__}/scripts/vue"
        )
        sleep 5
        response = Celestite.render("/")
        response.should eq("<div id=\"celestite-app\" data-server-rendered=\"true\"><div>Test!</div></div>")
      ensure
        renderer.kill_server if renderer
      end
      it "renders a template (called from the module level) with a default template" do
        renderer = Celestite.initialize(
          engine: Celestite::Engine::Vue,
          routes_file: "#{__DIR__}/scripts/vue/routes.js",
          component_dir: "#{__DIR__}/scripts/vue",
          template_dir: "#{__DIR__}/scripts/vue",
          default_template: "test.html"
        )
        sleep 5
        response = Celestite.render("/")
        response.should contain("<html>\n\n") if response
      ensure
        renderer.kill_server if renderer
      end
    end
    describe "Svelte" do
      it "renders a template (called from the module-level)" do
        renderer = Celestite.initialize(
          engine: Celestite::Engine::Svelte,
          component_dir: "#{__DIR__}/scripts/svelte"
        )
        sleep 5
        response = Celestite.render("/")
        response.should contain("<div id=celestite-app>") if response
        response.should contain("<div>Test!</div>") if response
      ensure
        renderer.kill_server if renderer
      end
    end
  end
end
