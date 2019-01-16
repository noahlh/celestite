const path = require('path')
const VueLoaderPlugin = require('vue-loader/lib/plugin')

module.exports = {
  resolve: {
    alias: {
      scripts: path.resolve(__dirname, '../../src/scripts/'),
    }
  },
  resolveLoader: {
    modules: [path.resolve(__dirname, '../../node_modules')]
  },
  module: {
    rules: [{
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['env']
        }
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          'vue-style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        exclude: /node_modules/,
        use: [
          'file-loader?name=/images/[name].[ext]'
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        exclude: /node_modules/,
        use: [
          'file-loader?name=/[name].[ext]'
        ]
      },
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
  ]
}