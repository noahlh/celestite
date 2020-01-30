require "../spec_helper"

test_logger = get_logger

describe Celestite do
  describe Celestite::Renderer do
    describe "#initialize" do
      it "logs its initialization" do
        IO.pipe do |r, w|
          logger = Logger.new(w)
          logger.progname = "Celestite"
          Celestite::Renderer::Generic.new(logger: logger)
          r.gets.should match(/Renderer Initialized/)
        end
      end
      it "can be initialized with no params" do
        r = Celestite::Renderer::Generic.new
        r.should be_a(Celestite::Renderer)
      end
      it "can initialize a Vue renderer" do
        r = Celestite::Renderer::Vue.new
        r.should be_a(Celestite::Renderer::Vue)
      end
      it "can initialize a Svelte renderer" do
        r = Celestite::Renderer::Svelte.new
        r.should be_a(Celestite::Renderer::Svelte)
      end
    end
    describe "#start_server" do
      describe "Vue" do
        it "raises an exception if no routes_file set" do
          expect_raises(Exception, "Error - you must define routes_file to launch the node process") do
            proc = Celestite::Renderer::Vue.new.start_server
          end
        end
        it "raises an exception if no component_dir set" do
          expect_raises(Exception, "Error - you must define component_dir to launch the node process") do
            r = Celestite::Renderer::Vue.new(routes_file: "test.js")
            proc = r.start_server
          end
        end
        it "spawns a node process (whether it's valid or not)" do
          r = Celestite::Renderer::Vue.new(component_dir: "../../spec/scripts/vue", routes_file: "../../spec/scripts/vue/routes.js")
          proc = r.start_server
          proc.should be_a(Process)
        ensure
          proc.kill if proc
        end
        it "raises an exception if the server doesn't start within a specified timeout" do
          r = Celestite::Renderer::Vue.new(
            routes_file: "#{__DIR__}/../../spec/scripts/vue/routes.js",
            component_dir: "#{__DIR__}/../../spec/scripts/vue"
          )
          expect_raises(Exception, "Node server failed to start within timeout") do
            run_spec_server(r, timeout: 0.001.seconds) do
              res = r.render("/")
            end
          end
        end
        it "raises an exception if the server is started with an invalid routes file" do
          r = Celestite::Renderer::Vue.new(
            routes_file: "foo.js",
            component_dir: "#{__DIR__}/../../spec/scripts/vue"
          )
          expect_raises(Exception, "Node server failed") do
            run_spec_server(r) do
              res = r.render("/")
            end
          end
        end
      end
      describe "Svelte" do
        it "raises an exception if no component_dir set" do
          expect_raises(Exception, "Error - you must define component_dir to launch the node process") do
            r = Celestite::Renderer::Svelte.new
            proc = r.start_server
          end
        end
        it "spawns a node process" do
          r = Celestite::Renderer::Svelte.new(component_dir: "./")
          proc = r.start_server
          proc.should be_a(Process)
        ensure
          proc.kill if proc
        end
        it "raises an exception if the server doesn't start within a specified timeout" do
          r = Celestite::Renderer::Svelte.new(
            component_dir: "./"
          )
          expect_raises(Exception, "Node server failed to start within timeout") do
            run_spec_server(r, timeout: 0.001.seconds) do
              res = r.render("/")
            end
          end
        end
        it "raises an exception if the server is started with an invalid component directory" do
          Celestite::Engine::Svelte.make_clean!

          r = Celestite::Renderer::Svelte.new(
            component_dir: "foo"
          )
          expect_raises(Exception, "Node server failed") do
            run_spec_server(r) do
              res = r.render("/")
            end
          end
        end
      end
    end
    describe "#render" do
      describe "Vue" do
        it "Renders a vue component (no context) and returns the raw HTML" do
          r = Celestite::Renderer::Vue.new(
            routes_file: "#{__DIR__}/../scripts/vue/routes.js",
            component_dir: "#{__DIR__}/../scripts/vue"
          )
          run_spec_server(r) do
            res = r.render("/")
            res.should eq("<div id=\"celestite-app\" data-server-rendered=\"true\"><div>Test!</div></div>")
          end
        end
        it "Renders a vue component (w/ context) and returns the raw HTML" do
          r = Celestite::Renderer::Vue.new(
            routes_file: "#{__DIR__}/../scripts/vue/routes.js",
            component_dir: "#{__DIR__}/../scripts/vue"
          )
          run_spec_server(r) do
            res = r.render("/context", Celestite::Context{:foo => "bar"})
            res.should eq("<div id=\"celestite-app\" data-server-rendered=\"true\"><div>Test context: bar</div></div>")
          end
        end
        it "Renders a vue component w/ a template specified" do
          r = Celestite::Renderer::Vue.new(
            routes_file: "#{__DIR__}/../scripts/vue/routes.js",
            component_dir: "#{__DIR__}/../scripts/vue",
            template_dir: "#{__DIR__}/../scripts/vue",
          )
          run_spec_server(r) do
            res = r.render("/", template: "test.html")
            res.should contain("<html>\n\n")
          end
        end
        it "Renders a vue component w/ a default template specified" do
          r = Celestite::Renderer::Vue.new(
            routes_file: "#{__DIR__}/../scripts/vue/routes.js",
            component_dir: "#{__DIR__}/../scripts/vue",
            template_dir: "#{__DIR__}/../scripts/vue",
            default_template: "test.html"
          )
          run_spec_server(r) do
            res = r.render("/")
            res.should contain("<html>\n\n")
          end
        end
      end
      describe "Svelte" do
        it "Renders a svelte component (no context) and returns the raw HTML" do
          r = Celestite::Renderer::Svelte.new(
            component_dir: "#{__DIR__}/../scripts/svelte"
          )
          run_spec_server(r) do
            res = r.render("/")
            res.should contain("<div id=celestite-app>")
            res.should contain("<div>Test!</div>")
          end
        end
        it "Renders a svelte component (w/ context) and returns the raw HTML" do
          r = Celestite::Renderer::Svelte.new(
            component_dir: "#{__DIR__}/../scripts/svelte"
          )
          run_spec_server(r) do
            res = r.render("/context", Celestite::Context{:foo => "bar"})
            res.should contain("<div>Test context: bar</div>")
          end
        end
      end
    end
  end
end
