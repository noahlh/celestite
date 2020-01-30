require "../spec_helper"

class GenericController
  include Celestite::Adapter::Amber

  def vue_context_test_getter
    @vue_context
  end

  def sapper_session_test_getter
    @sapper_session
  end
end

describe Celestite do
  describe Celestite::Adapter::Amber do
    describe "macro included" do
      it "inits a @vue_context object when included" do
        c = GenericController.new
        c.vue_context_test_getter.should be_a(Celestite::Context)
      end
      it "inits a @sapper_session object when included" do
        c = GenericController.new
        c.sapper_session_test_getter.should be_a(Celestite::Context)
      end
    end
  end
end
