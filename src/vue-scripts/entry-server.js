import { createApp } from "./app";

export default context => {
  const { app, router, store } = createApp();

  router.push(context.pathname);

  if (context.celestiteContext) {
    store.commit("SSR_INIT", context.celestiteContext);
  }

  context.state = store.state;

  return app;
};
