const webpack = require('webpack')
const merge = require('webpack-merge')
const path = require('path')
const baseConfig = require('./webpack-base-cfg.js')
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin')

module.exports = merge(baseConfig, {
  name: 'vue-client',
  entry: {
    client: 'scripts/entry-client.js',
  },
  output: {
    filename: 'cvue.[name].js'
  },
  plugins: [
    new VueSSRClientPlugin()
  ]
})