import Vue from 'vue'
import Router from 'vue-router'
import routes from 'vueRoutes'

Vue.use(Router)

// Load up every .vue component in the directory and expose them
// by their file names, to be used in the routes.
const vueComponents = {}
const requireComponent = require.context(
  'components', // resolved by Webpack
  true, // look in subfolders
  /[A-Z]\w+\.(vue|js)$/
)

requireComponent.keys().forEach(fileName => {
  // load the actual component
  const componentConfig = requireComponent(fileName)

  // Strip the leading `./` from the filename
  const componentName = fileName.replace(/^\.\/(.*)\.\w+$/, '$1')

  // put all components into a helper object
  vueComponents[componentName] = componentConfig.default
})

// Replace the text strings in the routes file with the actual component references
const replacedRoutes = routes.map(route => {
  return {
    path: route.path,
    component: vueComponents[route.component]
  }
})

// Create the router!
export function createRouter() {
  return new Router({
    mode: 'history',
    routes: replacedRoutes
  })
}