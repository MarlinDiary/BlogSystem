<!-- Icon.svelte -->
<script lang="ts">
  import type { IconProps } from './types';
  
  export let width: IconProps['width'] = undefined;
  export let height: IconProps['height'] = undefined;
  export let className: IconProps['className'] = undefined;
</script>

<div class={className} style:width={width} style:height={height}>
  <slot />
</div> 