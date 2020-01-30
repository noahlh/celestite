const path = require("path");
const VueLoaderPlugin = require("vue-loader/lib/plugin");

module.exports = {
  resolve: {
    alias: {
      scripts: path.resolve(__dirname, "../")
    },
    modules: [path.resolve(__dirname, "../../../node_modules")]
  },
  resolveLoader: {
    modules: [path.resolve(__dirname, "../../../node_modules")]
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: {
          loader: "vue-loader"
        }
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            rootMode: "upward"
          }
        }
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: ["vue-style-loader", "css-loader"]
      },
      {
        test: /\.scss$/,
        use: ["vue-style-loader", "css-loader", "sass-loader"]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name]-[hash:8].[ext]",
              outputPath: "images",
              publicPath: "assets/dist/images"
            }
          }
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name]-[hash:8].[ext]",
              outputPath: "fonts",
              publicPath: "assets/dist/fonts"
            }
          }
        ]
      }
    ]
  },
  plugins: [new VueLoaderPlugin()]
};
