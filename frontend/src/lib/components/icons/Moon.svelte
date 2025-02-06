<!-- Moon.svelte -->
<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconProps } from './types';

  export let className: IconProps['className'] = undefined;
  export let width: IconProps['width'] = undefined;
  export let height: IconProps['height'] = undefined;
</script>

<Icon {className} {width} {height}>
  <svg 
    viewBox="0 0 24 24" 
    aria-hidden="true"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M17.25 16.22a6.937 6.937 0 0 1-9.47-9.47 7.451 7.451 0 1 0 9.47 9.47ZM12.75 7C17 7 17 2.75 17 2.75S17 7 21.25 7C17 7 17 11.25 17 11.25S17 7 12.75 7Z" />
  </svg>
</Icon> 