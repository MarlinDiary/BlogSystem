<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import ReactionIcon from './ReactionIcon.svelte';
  import { auth } from '$lib/stores/auth';
  import { env } from '$env/dynamic/public';

  export let articleId;
  export let reactions = {
    like: 0,
    love: 0,
    haha: 0,
    angry: 0
  };
  export let isScrolled = false;

  const API_URL = env.PUBLIC_API_URL;
  const reactionTypes = ['like', 'love', 'haha', 'angry'];

  let userReaction = null;

  // 获取反应状态
  async function fetchReactionStatus() {
    try {
      console.log('获取反应状态 - API_URL:', API_URL);
      const response = await fetch(`${API_URL}/api/articles/${articleId}/reaction`, {
        headers: $auth.token ? {
          'Authorization': `Bearer ${$auth.token}`
        } : {}
      });
      if (response.ok) {
        const data = await response.json();
        userReaction = data.userReaction;
        reactions = data.reactionCounts;
      }
    } catch (err) {
      console.error('获取反应状态失败:', err);
    }
  }

  // 处理反应
  async function handleReaction(type) {
    if (!$auth.token) {
      // 如果用户未登录，显示登录提示
      const event = new CustomEvent('showAuthModal');
      window.dispatchEvent(event);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/articles/${articleId}/reaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${$auth.token}`
        },
        body: JSON.stringify({ type })
      });

      if (response.ok) {
        const data = await response.json();
        userReaction = data.userReaction;
        reactions = data.reactionCounts;
      }
    } catch (err) {
      console.error('反应失败:', err);
    }
  }

  // 监听用户登录状态变化
  $: if ($auth.isAuthenticated) {
    fetchReactionStatus();
  }

  onMount(fetchReactionStatus);
</script>

<style lang="postcss">
  .reactions {
    position: absolute;
    width: 48px;
    height: fit-content;
    display: none;
    z-index: 100;
    transition: all 0.3s ease;
    @media (min-width: 1024px) {
      display: block;
      position: fixed;
      left: 50%;
      transform: translateX(calc(50% + 440px));
      margin-right: -40px;
    }

    &[data-scrolled="true"] {
      top: 2rem;
      padding-top: 5rem;
    }

    &:not([data-scrolled="true"]) {
      top: 16rem;
    }
  }

  .reactions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0;
    align-items: center;
  }

  .reactions-container {
    background-image: linear-gradient(to bottom, rgb(244 244 245 / 0.8), rgb(255 255 255 / 0.9));
    border-radius: 1.5rem;
    backdrop-filter: blur(8px);
    padding-bottom: 0.5rem;
    @apply ring-1 ring-zinc-400/10;
    :global(.dark) & {
      background-image: linear-gradient(to bottom, rgb(39 39 42 / 0.8), rgb(24 24 27 / 0.8));
      @apply ring-1 ring-white/10;
    }
  }

  @media (max-width: 1280px) {
    .reactions {
      display: none;
    }
  }
</style>

<div
  role="toolbar"
  aria-label="文章反应"
  class="reactions"
  data-scrolled={isScrolled}
>
  <div class="reactions-container">
    <div class="reactions-list">
      {#each reactionTypes as type}
        <ReactionIcon
          {type}
          count={reactions[type]}
          isActive={userReaction === type}
          on:react={() => handleReaction(type)}
        />
      {/each}
    </div>
  </div>
</div> 