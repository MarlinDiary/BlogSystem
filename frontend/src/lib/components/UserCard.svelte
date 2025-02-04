<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { userApi } from '$lib/utils/api';
  import { goto } from '$app/navigation';

  export let userId: number;
  export let username: string = '';
  export let avatarUrl: string = '';
  export let realName: string = '';
  export let bio: string = '';
  export let dateOfBirth: string = '';
  
  const dispatch = createEventDispatcher();
  
  let articles: Array<{
    id: number;
    title: string;
    createdAt: string;
    viewCount: number;
  }> = [];
  
  let loading = false;
  let error = '';
  let userInfo: any = null;

  async function loadUserData() {
    try {
      loading = true;
      // 加载用户详细信息
      const userResponse = await fetch(`/api/users/${userId}`);
      if (userResponse.ok) {
        userInfo = await userResponse.json();
        console.log('用户数据:', {
          dateOfBirth,
          userInfoDateOfBirth: userInfo?.dateOfBirth,
          formattedDate: formatDate(dateOfBirth || userInfo?.dateOfBirth)
        });
      }
      
      // 加载用户文章
      const result = await userApi.getUserArticles(userId);
      articles = result.items.slice(0, 3);
    } catch (err: any) {
      console.error('加载用户数据失败:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function handleArticleClick(articleId: number) {
    dispatch('close');
    window.location.href = `/articles/${articleId}`;
  }

  onMount(() => {
    loadUserData();
  });

  function formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  }

  function trimText(text: string, maxLength: number = 100): string {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }
</script>

<style>
  .user-card-enter {
    animation: card-enter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes card-enter {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>

<div class="user-card-enter w-[min(90vw,420px)] bg-white/95 dark:bg-zinc-800/95 backdrop-blur-[2px] rounded-xl shadow-xl ring-1 ring-zinc-900/5 dark:ring-white/10 overflow-hidden">
  <div class="p-12 space-y-6">
    <!-- 头像 -->
    <div class="flex justify-center">
      <img
        src={avatarUrl || '/logo.png'}
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
      <p class="text-sm text-zinc-500 dark:text-zinc-400 text-center">暂无文章</p>
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
              <span>{article.viewCount} 阅读</span>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div> 