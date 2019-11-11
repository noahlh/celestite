const babelPresetEnv = require("@babel/preset-env");
const babelPluginModuleResolver = require("babel-plugin-module-resolver");
const path = require("path");

module.exports = function(api) {
  api.cache(true);

  const presets = [
    [
      babelPresetEnv,
      {
        targets: { node: true }
      }
    ]
  ];

  const plugins = [
    [
      babelPluginModuleResolver,
      {
        root: [path.resolve(__dirname)]
      }
    ]
  ];

  return { presets, plugins };
};
