<script>
    export let fullscreen = false;
    export let size = 'md'; // sm, md, lg
    export let color = 'primary'; // primary, white
  
    const sizeMap = {
      sm: 'h-6 w-6',
      md: 'h-8 w-8',
      lg: 'h-12 w-12'
    };
  
    const colorMap = {
      primary: 'border-lime-500 border-t-transparent',
      white: 'border-white border-t-transparent'
    };
  </script>
  
  {#if fullscreen}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 dark:bg-zinc-900/50">
      <div class="{sizeMap[size]} animate-spin rounded-full border-2 {colorMap[color]}"></div>
    </div>
  {:else}
    <div class="flex items-center justify-center py-4">
      <div class="{sizeMap[size]} animate-spin rounded-full border-2 {colorMap[color]}"></div>
    </div>
  {/if} 