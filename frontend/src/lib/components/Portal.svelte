<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  export let target: HTMLElement;

  let portal: HTMLElement;

  onMount(() => {
    if (target && portal) {
      target.appendChild(portal);
      return () => {
        try {
          target.removeChild(portal);
        } catch (e) {
          // 忽略错误，如果portal已经被移除
        }
      };
    }
  });
</script>

<div bind:this={portal}>
  <slot />
</div> 