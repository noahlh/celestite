import Vue from "vue";

import { createRouter } from "./router";
import { createStore } from "./store";
import { sync } from "vuex-router-sync";

import Base from "./Base.vue";

export function createApp() {
  const router = createRouter();
  const store = createStore();

  sync(store, router);

  const app = new Vue({
    router,
    store,
    render: h => h(Base)
  });

  return { app, router, store };
}
