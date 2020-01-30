require "./spec_helper"
require "./renderer/**"
require "./support/**"

describe Celestite do
  describe "self.init" do
    it "returns a Vue Renderer when called with no arguments" do
      r = Celestite.initialize(
        engine: Celestite::Engine::Vue,
        routes_file: "#{__DIR__}/scripts/vue/routes.js",
        component_dir: "#{__DIR__}/scripts/vue"
      )
      r.should be_a(Celestite::Renderer)
    ensure
      Celestite.kill_processes
    end
    it "returns a Svelte Renderer when called with no arguments" do
      r = Celestite.initialize(
        engine: Celestite::Engine::Svelte,
        component_dir: "#{__DIR__}/scripts/svelte"
      )
      r.should be_a(Celestite::Renderer)
    ensure
      Celestite.kill_processes
    end
  end
  describe "@@renderer" do
    it "should store a renderer in the module/class var" do
      Celestite.initialize(
        engine: Celestite::Engine::Vue,
        routes_file: "#{__DIR__}/scripts/vue/routes.js",
        component_dir: "#{__DIR__}/scripts/vue"
      )
      Celestite.renderer.should be_a(Celestite::Renderer)
    ensure
      Celestite.kill_processes
    end
    it "both returns & stores an init'd renderer in a class/module variable" do
      r = Celestite.initialize(
        engine: Celestite::Engine::Vue,
        routes_file: "#{__DIR__}/scripts/vue/routes.js",
        component_dir: "#{__DIR__}/scripts/vue"
      )
      r.should eq(Celestite.renderer)
    ensure
      Celestite.kill_processes
    end
  end
  describe "self.render" do
    describe "Vue" do
      it "renders a template (called from the module-level)" do
        Celestite.initialize(
          engine: Celestite::Engine::Vue,
          routes_file: "#{__DIR__}/scripts/vue/routes.js",
          component_dir: "#{__DIR__}/scripts/vue"
        )
        sleep 5
        r = Celestite.render("/")
        r.should eq("<div id=\"celestite-app\" data-server-rendered=\"true\"><div>Test!</div></div>")
      ensure
        Celestite.kill_processes
      end
      it "renders a template (called from the module level) with a default template" do
        Celestite.initialize(
          engine: Celestite::Engine::Vue,
          routes_file: "#{__DIR__}/scripts/vue/routes.js",
          component_dir: "#{__DIR__}/scripts/vue",
          template_dir: "#{__DIR__}/scripts/vue",
          default_template: "test.html"
        )
        sleep 5
        r = Celestite.render("/")
        r.should contain("<html>\n\n") if r
      ensure
        Celestite.kill_processes
      end
    end
    describe "Svelte" do
      it "renders a template (called from the module-level)" do
        Celestite.initialize(
          engine: Celestite::Engine::Svelte,
          component_dir: "#{__DIR__}/scripts/svelte"
        )
        sleep 5
        r = Celestite.render("/")
        r.should contain("<div id=celestite-app>") if r
        r.should contain("<div>Test!</div>") if r
      ensure
        Celestite.kill_processes
      end
    end
  end
end
