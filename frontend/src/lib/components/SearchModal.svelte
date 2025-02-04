<!-- SearchModal.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { api } from '$lib/utils/api';
  import { debounce } from 'lodash-es';
  
  export let isOpen = false;
  
  const dispatch = createEventDispatcher();
  let dialogRef: HTMLDialogElement;
  let searchInputRef: HTMLInputElement;
  let isClosing = false;
  let searchQuery = '';
  let searchResults: any[] = [];
  let isLoading = false;
  let error: string | null = null;
  
  // 处理关闭
  function close() {
    isClosing = true;
    setTimeout(() => {
      if (dialogRef) {
        dialogRef.close();
      }
      dispatch('close');
      isClosing = false;
      // 重置搜索
      searchQuery = '';
      searchResults = [];
      error = null;
    }, 200);
  }

  function handleClose() {
    if (dialogRef) {
      close();
    }
  }

  // 防抖搜索函数
  const debouncedSearch = debounce(async (query: string) => {
    if (!query.trim()) {
      searchResults = [];
      return;
    }

    isLoading = true;
    error = null;

    try {
      const response = await api('/api/articles', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        useStoredToken: false,
        params: {
          search: query,
          page: 1,
          pageSize: 10
        }
      });
      
      if (response && response.items) {
        searchResults = response.items;
      }
    } catch (err) {
      console.error('搜索失败:', err);
      error = err instanceof Error ? err.message : '搜索失败，请稍后重试';
      searchResults = [];
    } finally {
      isLoading = false;
    }
  }, 300);

  // 监听搜索输入
  $: {
    if (searchQuery) {
      debouncedSearch(searchQuery);
    } else {
      searchResults = [];
    }
  }

  // 监听isOpen变化，控制对话框显示状态
  $: if (isOpen) {
    isClosing = false;
    if (dialogRef) {
      document.body.style.overflow = 'hidden';
      dialogRef.showModal();
      // 使用 setTimeout 确保在对话框完全打开后再聚焦
      setTimeout(() => {
        if (searchInputRef) {
          searchInputRef.focus();
        }
      }, 50);
    }
  } else {
    if (dialogRef) {
      document.body.style.overflow = '';
      if (!isClosing) {
        dialogRef.close();
      }
    }
  }
</script>

{#if isOpen}
<dialog
  bind:this={dialogRef}
  class="fixed inset-0 z-50 bg-transparent p-0 m-0 max-w-none max-h-none w-screen h-screen {isClosing ? 'closing' : ''}"
  on:close={handleClose}
>
  <!-- 卡片容器 -->
  <div class="h-full overflow-y-auto">
    <div class="flex min-h-full items-center justify-center p-4">
      <!-- 背景遮罩按钮 - 用于处理点击背景关闭 -->
      <div class="fixed inset-0 bg-zinc-50/80 backdrop-blur-sm dark:bg-zinc-900/80"></div>
      <button
        class="fixed inset-0 w-full h-full bg-transparent cursor-default"
        on:click={close}
        aria-label="关闭搜索"
      ></button>

      <!-- 搜索卡片 -->
      <div class="relative bg-white/90 dark:bg-zinc-800/90 backdrop-blur-[2px] rounded-lg shadow-2xl shadow-zinc-500/20 dark:shadow-zinc-900/30 w-full max-w-2xl {isClosing ? 'modal-closing' : 'modal-open'}">
        <!-- 搜索框 -->
        <div class="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div class="relative">
            <input
              type="text"
              bind:this={searchInputRef}
              bind:value={searchQuery}
              placeholder="搜索文章..."
              class="w-full pl-10 pr-4 py-2 bg-transparent border-none text-lg text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-0"
            />
            <svg class="absolute left-2 top-3 w-5 h-5 text-zinc-400 dark:text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
        </div>

        <!-- 搜索结果 -->
        <div class="p-2 max-h-[70vh] overflow-y-auto">
          <!-- 加载状态 -->
          {#if isLoading}
            <div class="flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-500">
              <svg class="w-12 h-12 mb-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <p>搜索中...</p>
            </div>
          <!-- 错误状态 -->
          {:else if error}
            <div class="flex flex-col items-center justify-center py-12 text-red-500">
              <svg class="w-12 h-12 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p>{error}</p>
            </div>
          <!-- 空状态 -->
          {:else if !searchQuery}
            <div class="flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-500">
              <svg class="w-12 h-12 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p>输入关键词开始搜索</p>
            </div>
          <!-- 搜索结果为空 -->
          {:else if searchQuery && searchResults.length === 0}
            <div class="flex flex-col items-center justify-center py-12 text-zinc-400 dark:text-zinc-500">
              <svg class="w-12 h-12 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p>未找到相关文章</p>
            </div>
          <!-- 搜索结果列表 -->
          {:else}
            <div class="space-y-2">
              {#each searchResults as result}
                <a
                  href="/articles/{result.id}"
                  class="block p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
                  on:click={close}
                >
                  <h3 class="text-zinc-900 dark:text-white font-medium">{result.title}</h3>
                  <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">{result.content}</p>
                  <div class="mt-2 flex items-center text-xs text-zinc-400 dark:text-zinc-500 space-x-4">
                    <span>{new Date(result.createdAt).toLocaleDateString()}</span>
                    <span>阅读 {result.viewCount || 0}</span>
                    <span>评论 {result.commentCount || 0}</span>
                  </div>
                </a>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</dialog>
{/if}

<style>
  dialog::backdrop {
    display: none;
  }

  dialog {
    border: none;
    background: transparent;
  }

  .modal-open {
    animation: modal-open 0.2s ease-out;
  }

  .modal-closing {
    animation: modal-close 0.2s ease-in;
  }

  @keyframes modal-open {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes modal-close {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.95);
    }
  }
</style> 