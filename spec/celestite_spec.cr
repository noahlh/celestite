require "./spec_helper"
require "./renderer/**"
require "./support/**"

describe Celestite do
  describe "self.init" do
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
        engine: Celestite::Engine::Svelte,
        component_dir: "#{__DIR__}/scripts/svelte"
      )
      Celestite.renderer.should be_a(Celestite::Renderer)
    ensure
      renderer.kill_server if renderer
    end
    it "both returns & stores an init'd renderer in a class/module variable" do
      renderer = Celestite.initialize(
        engine: Celestite::Engine::Svelte,
        component_dir: "#{__DIR__}/scripts/svelte"
      )
      renderer.should eq(Celestite.renderer)
    ensure
      renderer.kill_server if renderer
    end
  end
  describe "self.render" do
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
