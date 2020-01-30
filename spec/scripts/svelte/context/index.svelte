<div>Test context: { test_context }</div>

<script>
  import { stores } from "@sapper/app";
  const { session } = stores();
  let test_context = $session.foo;
</script>
