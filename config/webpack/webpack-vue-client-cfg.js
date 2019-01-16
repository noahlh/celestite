const webpack = require('webpack')
const merge = require('webpack-merge')
const path = require('path')
const baseConfig = require('./webpack-base-cfg.js')
const VuewSSRClientPlugin = require('vue-server-renderer/client-plugin')

module.exports = merge(baseConfig, {
  entry: 'scripts/entry-client.js',
  output: {
    filename: 'cvue.[name].js'
  },
  plugins: [
    new VuewSSRClientPlugin()
  ]
})