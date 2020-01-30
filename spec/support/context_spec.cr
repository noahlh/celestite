require "../spec_helper"

describe Celestite do
  describe Celestite::Context do
    describe "#to_json" do
      it "Converts a Celestite::Conext Hashlike to a JSON object" do
        v = Celestite::Context{:foo => "bar"}
        v.to_json.should eq("{\"foo\":\"bar\"}")
      end
    end
  end
end
