<template>
  <div>Test context: {{ foo }}</div>
</template>

<script>
module.exports = {
  data() {
    return {}
  },
  computed: {
    foo() {
      return this.$store.state.crystal.foo
    }
  }
}
</script>

<style>
</style>