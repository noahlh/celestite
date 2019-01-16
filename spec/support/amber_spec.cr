require "../spec_helper"

class GenericController
  include CrystalVue::Adapter::Amber

  def vue_context_test_getter
    @vue_context
  end
end

describe CrystalVue do
  describe CrystalVue::Adapter::Amber do
    describe "macro included" do
      it "inits a @vue_context object when included" do
        c = GenericController.new
        c.vue_context_test_getter.should be_a(CrystalVue::Context)
      end
    end
  end
end
