require "../spec_helper"

describe CrystalVue do
  describe CrystalVue::Renderer do
    describe "#initialize" do
      it "logs its initialization" do
        IO.pipe do |r, w|
          logger = Logger.new(w)
          logger.progname = "VueSSR"
          CrystalVue::Renderer.new(logger: logger)
          r.gets.should match(/Renderer Initialized/)
        end
      end
      it "can be initialized with no params" do
        r = CrystalVue::Renderer.new
        r.should be_a(CrystalVue::Renderer)
      end
    end
    describe "#start_server" do
      it "raises an exception if no component_dir set" do
        expect_raises(Exception, "Error - you must define component_dir to launch the node process") do
          proc = CrystalVue::Renderer.new.start_server
        end
      end
      it "raises an exception if no routes_file set" do
        expect_raises(Exception, "Error - you must define routes_file to launch the node process") do
          r = CrystalVue::Renderer.new(component_dir: "/")
          proc = r.start_server
        end
      end
      it "spawns a node process (whether it's valid or not)" do
        r = CrystalVue::Renderer.new(component_dir: "/", routes_file: "test.js")
        proc = r.start_server
        proc.should be_a(Process)
      ensure
        proc.kill if proc
      end
      it "raises an exception if the server doesn't start within a specified timeout" do
        r = CrystalVue::Renderer.new(
          routes_file: "#{__DIR__}/../scripts/routes.js",
          component_dir: "#{__DIR__}/../scripts"
        )
        expect_raises(Exception, "Node server failed to start within timeout") do
          run_spec_server(r, timeout: 0.001.seconds) do
            res = r.render("/")
          end
        end
      end
      it "raises an exception if the server is started with an invalid routes file" do
        r = CrystalVue::Renderer.new(
          routes_file: "foo.js",
          component_dir: "#{__DIR__}/../scripts"
        )
        expect_raises(Exception, "Node server terminated due to fault") do
          run_spec_server(r) do
            res = r.render("/")
          end
        end
      end
    end
    describe "#render" do
      it "Renders a vue component (no context) and returns the raw HTML" do
        r = CrystalVue::Renderer.new(
          routes_file: "#{__DIR__}/../scripts/routes.js",
          component_dir: "#{__DIR__}/../scripts"
        )
        run_spec_server(r) do
          res = r.render("/")
          res.should eq("<div id=\"crystal-vue-app\" data-server-rendered=\"true\"><div>Test!</div></div>")
        end
      end
      it "Renders a vue component (w/ context) and returns the raw HTML" do
        r = CrystalVue::Renderer.new(
          routes_file: "#{__DIR__}/../scripts/routes.js",
          component_dir: "#{__DIR__}/../scripts"
        )
        run_spec_server(r) do
          res = r.render("/context", CrystalVue::Context{:foo => "bar"})
          res.should eq("<div id=\"crystal-vue-app\" data-server-rendered=\"true\"><div>Test context: bar</div></div>")
        end
      end
      it "Renders a vue component w/ a template specified" do
        r = CrystalVue::Renderer.new(
          routes_file: "#{__DIR__}/../scripts/routes.js",
          component_dir: "#{__DIR__}/../scripts",
          template_dir: "#{__DIR__}/../scripts",
        )
        run_spec_server(r) do
          res = r.render("/", template: "test.html")
          res.should contain("<html>\n\n")
        end
      end
      it "Renders a vue component w/ a default template specified" do
        r = CrystalVue::Renderer.new(
          routes_file: "#{__DIR__}/../scripts/routes.js",
          component_dir: "#{__DIR__}/../scripts",
          template_dir: "#{__DIR__}/../scripts",
          default_template: "test.html"
        )
        run_spec_server(r) do
          res = r.render("/")
          res.should contain("<html>\n\n")
        end
      end
    end
  end
end
