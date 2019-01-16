import { createApp } from "scripts/app"

export default context => {
  const { app, router, store } = createApp()

  router.push(context.pathname)

  if (context.vueContext) {
    store.commit('SSR_INIT', context.vueContext)
  }

  context.state = store.state

  return app
}