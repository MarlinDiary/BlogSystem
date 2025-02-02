<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let type: string;
  export let count = 0;

  const dispatch = createEventDispatcher();

  // 格式化数字
  function prettifyNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
</script>

<div class="relative flex flex-col items-center">
  <button
    on:click={() => dispatch('react')}
    class="relative flex h-10 w-10 items-center justify-center"
  >
    <img
      src="/reactions/{type}.png"
      alt={type}
      class="h-8 w-8"
    />
  </button>
  
  <span 
    class="mt-0.5 flex w-full items-center justify-center
      whitespace-nowrap text-[12px] font-semibold
      text-zinc-700/30 dark:text-zinc-200/25"
  >
    {prettifyNumber(count)}
  </span>
</div> 