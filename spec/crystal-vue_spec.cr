require "./spec_helper"
require "./renderer/**"
require "./support/**"

describe CrystalVue do
  describe "self.init" do
    it "returns a Renderer when called with no arguments" do
      r = CrystalVue.init(
        routes_file: "#{__DIR__}/scripts/routes.js",
        component_dir: "#{__DIR__}/scripts"
      )
      r.should be_a(CrystalVue::Renderer)
    ensure
      CrystalVue.kill_processes
    end
  end
  describe "@@renderer" do
    it "should store a renderer in the module/class var" do
      CrystalVue.init(
        routes_file: "#{__DIR__}/scripts/routes.js",
        component_dir: "#{__DIR__}/scripts"
      )
      CrystalVue.renderer.should be_a(CrystalVue::Renderer)
    ensure
      CrystalVue.kill_processes
    end
    it "both returns & stores an init'd renderer in a class/module variable" do
      r = CrystalVue.init(
        routes_file: "#{__DIR__}/scripts/routes.js",
        component_dir: "#{__DIR__}/scripts"
      )
      r.should eq(CrystalVue.renderer)
    ensure
      CrystalVue.kill_processes
    end
  end
  describe "self.render" do
    it "renders a template (called from the module-level)" do
      CrystalVue.init(
        routes_file: "#{__DIR__}/scripts/routes.js",
        component_dir: "#{__DIR__}/scripts"
      )
      sleep 3
      r = CrystalVue.render("/")
      r.should eq("<div id=\"crystal-vue-app\" data-server-rendered=\"true\"><div>Test!</div></div>")
    ensure
      CrystalVue.kill_processes
    end
    it "renders a template (called from the module level) with a default template" do
      CrystalVue.init(
        routes_file: "#{__DIR__}/scripts/routes.js",
        component_dir: "#{__DIR__}/scripts",
        template_dir: "#{__DIR__}/scripts",
        default_template: "test.html"
      )
      sleep 3
      r = CrystalVue.render("/")
      r.should contain("<html>\n\n") if r
    end
  end
end
