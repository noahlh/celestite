// This is the webpack config file that Svelte/Sapper makes use of.
// Unfortunately it's not (easily) possible to customize the name or location
// of this file in Sapper, so it has to live here with this name.  Sorry for any confusion.
// Ideally, it should live in the client project directory (so you can customize it per-project).
// We'll get there.

const webpack = require("webpack");
const path = require("path");
const config = require("sapper/config/webpack.js");
const pkg = require("../../package.json");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const mode = process.env.NODE_ENV === "development" ? "development" : "production";
const dev = mode === "development";

const alias = {
  svelte: path.resolve("../../", "node_modules", "svelte"),
  "@sapper": path.resolve("node_modules", "@sapper"),
};
const extensions = [".mjs", ".js", ".json", ".svelte", ".html"];
const mainFields = ["svelte", "module", "browser", "main"];
const modules = ["node_modules"];

const sveltePreprocess = require("svelte-preprocess");

module.exports = {
  client: {
    entry: config.client.entry(),
    output: config.client.output(),
    resolve: { alias, extensions, mainFields, modules },
    module: {
      rules: [
        {
          test: /\.(svelte|html)$/,
          use: {
            loader: "svelte-loader",
            options: {
              dev,
              hydratable: true,
              hotReload: false, // pending https://github.com/sveltejs/svelte/issues/2377,
              emitCss: true,
              preprocess: sveltePreprocess(),
            },
          },
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, "css-loader"],
        },
        {
          test: /\.(png|svg|jpg|gif)$/,
          loader: "file-loader",
          options: {
            name: "[name]-[hash:8].[ext]",
            publicPath: "/client/",
          },
        },
        {
          test: /\.(woff|woff2)$/,
          loader: "file-loader",
          options: {
            name: "[name]-[hash:8].[ext]",
            publicPath: "/client/",
          },
        },
      ],
    },
    mode,
    plugins: [
      // pending https://github.com/sveltejs/svelte/issues/2377
      // dev && new webpack.HotModuleReplacementPlugin(),
      new webpack.DefinePlugin({
        "process.browser": true,
        "process.env.NODE_ENV": JSON.stringify(mode),
      }),
      new MiniCssExtractPlugin({
        filename: "[name]-[hash:8].css",
        chunkFilename: "[id]-[hash:8].css",
      }),
    ].filter(Boolean),
    devtool: dev && "inline-source-map",
  },

  server: {
    entry: config.server.entry(),
    output: config.server.output(),
    target: "node",
    resolve: { alias, extensions, mainFields, modules },
    externals: Object.keys(pkg.dependencies).concat("encoding"),
    module: {
      rules: [
        {
          test: /\.(svelte|html)$/,
          use: {
            loader: "svelte-loader",
            options: {
              css: false,
              emitCss: false,
              generate: "ssr",
              dev,
            },
          },
        },
        {
          test: /\.(png|jpe?g|gif)$/i,
          loader: "file-loader",
          options: {
            name: "[name]-[hash:8].[ext]",
            publicPath: "client/",
            emitFile: false,
          },
        },
        {
          test: /\.(woff|woff2)$/i,
          loader: "file-loader",
          options: {
            name: "[name]-[hash:8].[ext]",
            publicPath: "client/",
            emitFile: false,
          },
        },
      ],
    },
    mode,
    performance: {
      hints: false, // it doesn't matter if server.js is large
    },
  },
};
