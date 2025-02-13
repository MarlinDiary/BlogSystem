<script>
    import { onMount, createEventDispatcher, onDestroy } from 'svelte';
    import { userApi } from '$lib/utils/api';
    import { fade, scale } from 'svelte/transition';
    import { quartOut, quartIn } from 'svelte/easing';
    import { getImageUrl } from '$lib/utils/api';
    import { t } from '$lib/i18n';
    import { browser } from '$app/environment';
    import Portal from './Portal.svelte';
    import { goto } from '$app/navigation';
  
    export let userId;
    export let username = '';
    export let avatarUrl = '';
    export let realName = '';
    export let bio = '';
    export let dateOfBirth = '';
    export let isOpen = false;
    
    const dispatch = createEventDispatcher();
    let portalContainer;
    let articles = [];
    let loading = false;
    let error = '';
    let userInfo = null;
    let mounted = false;

    $: if (browser && !portalContainer) {
      portalContainer = document.body;
    }

    $: if (isOpen && browser && mounted) {
      document.body.style.overflow = 'hidden';
      loadUserData();
    } else if (browser) {
      document.body.style.overflow = '';
    }
  
    async function loadUserData() {
      if (!userId) return;
      
      try {
        loading = true;
        error = '';
        
        const userResponse = await fetch(`/api/users/${userId}`);
        if (userResponse.ok) {
          userInfo = await userResponse.json();
        }
        
        const result = await userApi.getUserArticles(userId);
        articles = result.items.slice(0, 3);
      } catch (err) {
        console.error('加载用户数据失败:', err);
        error = $t('userCard.loadError');
      } finally {
        loading = false;
      }
    }
  
    function close() {
      isOpen = false;
      dispatch('close');
    }

    async function handleArticleClick(articleId) {
      close();
      await goto(`/articles/${articleId}`);
    }
  
    onMount(() => {
      mounted = true;
      if (isOpen && userId) {
        loadUserData();
      }
    });
  
    onDestroy(() => {
      if (browser) {
        document.body.style.overflow = '';
      }
    });
  
    function formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    }
  
    function trimText(text, maxLength = 100) {
      if (!text) return '';
      return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
    }
</script>

{#if isOpen && browser && mounted}
  <Portal target={portalContainer}>
    <div 
      class="fixed inset-0 z-[999] overflow-hidden"
      transition:fade={{ duration: 200 }}
    >
      <div
        role="button"
        tabindex="0"
        on:click={close}
        on:keydown={e => e.key === 'Escape' && close()}
        class="absolute inset-0 bg-zinc-800/40 backdrop-blur-sm dark:bg-black/80"
      ></div>
      
      <div class="flex min-h-full items-center justify-center p-4">
        <div 
          class="relative bg-white/90 dark:bg-zinc-800/90 backdrop-blur-[2px] rounded-xl shadow-2xl shadow-zinc-500/20 dark:shadow-zinc-900/30 w-[min(90vw,420px)]"
          transition:scale={{ 
            duration: 200,
            start: 0.95,
            opacity: 0
          }}
        >
          <div class="p-12 space-y-6">
            <!-- 头像 -->
            <div class="flex justify-center">
              <img
                src={getImageUrl(avatarUrl) || '/logo.png'}
                alt={username}
                class="w-24 h-24 rounded-full object-cover ring-2 ring-white/50 dark:ring-zinc-700/50"
              />
            </div>

            <!-- 用户名 -->
            <div class="text-center">
              <h3 class="text-2xl font-semibold text-zinc-900 dark:text-white uppercase">
                {username}
              </h3>
            </div>

            <!-- 真实姓名 -->
            {#if realName || userInfo?.realName}
              <div class="flex items-start text-sm text-zinc-600 dark:text-zinc-300">
                <svg class="w-5 h-5 mr-3 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{realName || userInfo?.realName}</span>
              </div>
            {/if}

            <!-- 生日 -->
            {#if (dateOfBirth || userInfo?.dateOfBirth)}
              <div class="flex items-center text-sm text-zinc-600 dark:text-zinc-300">
                <svg class="w-5 h-5 mr-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
                  <path d="M16 2v4" />
                  <path d="M8 2v4" />
                  <path d="M3 10h18" />
                </svg>
                <span>{formatDate(dateOfBirth || userInfo?.dateOfBirth)}</span>
              </div>
            {/if}

            <!-- 简介 -->
            {#if (bio || userInfo?.bio)}
              <div class="flex items-start text-sm text-zinc-600 dark:text-zinc-300">
                <svg class="w-5 h-5 mr-3 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <p class="line-clamp-3">{trimText(bio || userInfo?.bio, 150)}</p>
              </div>
            {/if}
          </div>

          <!-- 分割线 -->
          <div class="h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent"></div>

          <!-- 文章列表部分 -->
          <div class="px-12 py-6">
            {#if loading}
              <div class="flex justify-center py-8">
                <div class="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-300 rounded-full animate-spin"></div>
              </div>
            {:else if error}
              <p class="text-sm text-red-500 dark:text-red-400">{error}</p>
            {:else if articles.length === 0}
              <p class="text-sm text-zinc-500 dark:text-zinc-400 text-center">{$t('userCard.noArticles')}</p>
            {:else}
              <div class="space-y-4">
                {#each articles as article}
                  <button
                    class="block group w-full text-left"
                    on:click={() => handleArticleClick(article.id)}
                  >
                    <h5 class="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-lime-600 dark:group-hover:text-lime-400 truncate">
                      {article.title}
                    </h5>
                    <div class="mt-1.5 flex items-center text-xs text-zinc-500 dark:text-zinc-400 space-x-2">
                      <span>{formatDate(article.createdAt)}</span>
                      <span>·</span>
                      <span>{article.viewCount} {$t('userCard.views')}</span>
                    </div>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </Portal>
{/if} 