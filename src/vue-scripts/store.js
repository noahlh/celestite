import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

export function createStore() {
  return new Vuex.Store({
    state: {
      crystal: {}
    },
    mutations: {
      SSR_INIT(state, celestiteContext) {
        for (const [key, value] of Object.entries(celestiteContext)) {
          Vue.set(state.crystal, key, value);
        }
      }
    }
  });
}
