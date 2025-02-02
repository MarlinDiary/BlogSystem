<script lang="ts">
  import { onMount } from 'svelte';
  
  let title = '';
  let content = '';
  let tags: string[] = [];
  let newTag = '';
  
  function handlePublish() {
    // TODO: 实现发布逻辑
    console.log('发布文章:', { title, content, tags });
  }
  
  function addTag() {
    if (newTag && !tags.includes(newTag)) {
      tags = [...tags, newTag];
      newTag = '';
    }
  }
  
  function removeTag(tag: string) {
    tags = tags.filter(t => t !== tag);
  }
</script>

<div class="mx-auto max-w-2xl">
  <h1 class="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
    发布文章
  </h1>
  
  <div class="mt-8 space-y-6">
    <!-- 标题输入 -->
    <div>
      <label for="title" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        文章标题
      </label>
      <input
        id="title"
        type="text"
        bind:value={title}
        class="mt-1 w-full rounded-lg border border-zinc-300 bg-white/90 px-4 py-2 text-base text-zinc-800 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-white/10"
        placeholder="输入文章标题..."
      />
    </div>
    
    <!-- 标签输入 -->
    <div>
      <label for="tag-input" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        文章标签
      </label>
      <div class="mt-1 flex items-center gap-2">
        <input
          id="tag-input"
          type="text"
          bind:value={newTag}
          class="flex-1 rounded-lg border border-zinc-300 bg-white/90 px-4 py-2 text-base text-zinc-800 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-white/10"
          placeholder="添加标签..."
          on:keydown={e => e.key === 'Enter' && addTag()}
        />
        <button
          on:click={addTag}
          class="rounded-lg bg-lime-600 px-4 py-2 text-sm font-medium text-white hover:bg-lime-700 dark:bg-lime-500 dark:hover:bg-lime-600"
        >
          添加
        </button>
      </div>
      {#if tags.length > 0}
        <div class="mt-2 flex flex-wrap gap-2">
          {#each tags as tag}
            <span class="inline-flex items-center rounded-full bg-lime-100 px-3 py-0.5 text-sm font-medium text-lime-800 dark:bg-lime-900 dark:text-lime-200">
              {tag}
              <button
                type="button"
                class="ml-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-lime-600 hover:bg-lime-200 hover:text-lime-900 focus:bg-lime-500 focus:text-white dark:text-lime-400 dark:hover:bg-lime-800"
                on:click={() => removeTag(tag)}
              >
                ×
              </button>
            </span>
          {/each}
        </div>
      {/if}
    </div>
    
    <!-- 内容输入 -->
    <div>
      <label for="content" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        文章内容
      </label>
      <textarea
        id="content"
        bind:value={content}
        rows="10"
        class="mt-1 w-full rounded-lg border border-zinc-300 bg-white/90 px-4 py-2 text-base text-zinc-800 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-white/10"
        placeholder="输入文章内容..."
      ></textarea>
    </div>
    
    <!-- 发布按钮 -->
    <div class="flex justify-end">
      <button
        on:click={handlePublish}
        class="rounded-lg bg-lime-600 px-6 py-2 text-base font-medium text-white hover:bg-lime-700 dark:bg-lime-500 dark:hover:bg-lime-600"
      >
        发布文章
      </button>
    </div>
  </div>
</div> 