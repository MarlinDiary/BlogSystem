<script>
  import { onMount } from 'svelte';
  
  let searchQuery = '';
  let searchResults = [];
  
  function handleSearch() {
    // TODO: 实现搜索逻辑
    console.log('搜索:', searchQuery);
  }
</script>

<div class="mx-auto max-w-2xl">
  <h1 class="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
    搜索文章
  </h1>
  
  <div class="mt-6">
    <div class="relative">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="输入关键词搜索..."
        class="w-full rounded-lg border border-zinc-300 bg-white/90 px-4 py-2 text-base text-zinc-800 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-white/10"
      />
      <button
        on:click={handleSearch}
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-lime-600 px-4 py-1 text-sm font-medium text-white hover:bg-lime-700 dark:bg-lime-500 dark:hover:bg-lime-600"
      >
        搜索
      </button>
    </div>
  </div>

  <div class="mt-8">
    {#if searchResults.length > 0}
      <div class="space-y-4">
        {#each searchResults as result}
          <div class="rounded-lg border border-zinc-100 p-4 dark:border-zinc-700/40">
            <h2 class="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
              {result.title}
            </h2>
            <p class="mt-2 text-zinc-600 dark:text-zinc-400">
              {result.excerpt}
            </p>
          </div>
        {/each}
      </div>
    {:else if searchQuery}
      <p class="text-center text-zinc-600 dark:text-zinc-400">
        未找到相关文章
      </p>
    {/if}
  </div>
</div> 