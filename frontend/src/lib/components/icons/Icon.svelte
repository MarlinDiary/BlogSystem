<!-- Icon.svelte -->
<script>
  export let width = undefined;
  export let height = undefined;
  export let className = undefined;
</script>

<div class={className} style:width={width} style:height={height}>
  <slot />
</div> 