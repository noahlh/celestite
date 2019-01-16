require "../spec_helper"

describe CrystalVue do
  describe CrystalVue::Context do
    describe "#to_json" do
      it "Converts a CrystalVue::Conext Hashlike to a JSON object" do
        v = CrystalVue::Context{:foo => "bar"}
        v.to_json.should eq("{\"foo\":\"bar\"}")
      end
    end
  end
end
