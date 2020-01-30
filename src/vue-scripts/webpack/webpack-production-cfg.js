const { resolve } = require("path");
const webpackServerConfig = require("./webpack-vue-server-cfg.js");
const webpackClientConfig = require("./webpack-vue-client-cfg.js");
const merge = require("webpack-merge");

// Utility function to handle exit on error
const _exit = m => {
  console.error(m);
  process.exit(1);
};

// Setup ENV vars
const NODE_ENV =
  (process.env.NODE_ENV == "test" ? "production" : process.env.NODE_ENV) ||
  "production";
const VUE_SSR_BUILD_DIR = resolve(__dirname, "../build/");
const VUE_CLIENT_BUILD_DIR_PUBLIC_PATH = process.env
  .VUE_CLIENT_BUILD_DIR_PUBLIC_PATH
  ? process.env.VUE_CLIENT_BUILD_DIR_PUBLIC_PATH
  : "/";
const VUE_COMPONENT_DIR = process.env.VUE_COMPONENT_DIR
  ? resolve(process.env.VUE_COMPONENT_DIR)
  : _exit(
      "Component directory not defined - please set VUE_COMPONENT_DIR environment variable"
    );
const VUE_ROUTES_FILE = process.env.VUE_ROUTES_FILE
  ? resolve(process.env.VUE_ROUTES_FILE)
  : _exit(
      "Routes file must be specified - please set VUE_ROUTES_FILE environment variable"
    );

const webpackCommonVariableConfig = {
  mode: NODE_ENV,
  output: {
    path: VUE_SSR_BUILD_DIR,
    publicPath: VUE_CLIENT_BUILD_DIR_PUBLIC_PATH
  },
  resolve: {
    alias: {
      components: VUE_COMPONENT_DIR,
      vueRoutes$: VUE_ROUTES_FILE
    }
  },
  stats: {
    chunks: false,
    colors: true,
    modules: false
  }
};

module.exports = [
  merge(webpackCommonVariableConfig, webpackClientConfig),
  merge(webpackCommonVariableConfig, webpackServerConfig)
];
