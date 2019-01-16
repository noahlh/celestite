import Vue from 'vue'
import { mapState } from 'vuex'

import { createRouter } from "scripts/router"
import { createStore } from "scripts/store"
import { sync } from "vuex-router-sync"

import Base from "scripts/Base.vue"

export function createApp() {
  const router = createRouter()
  const store = createStore()

  sync(store, router)

  const app = new Vue({
    router,
    store,
    render: h => h(Base)
  })

  return { app, router, store }
}