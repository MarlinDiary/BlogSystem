<script>
    import { focusingFriendId } from '$lib/stores/friend';
    import TiltCard from './TiltCard.svelte';
    import { onMount } from 'svelte';
    import ColorThief from 'colorthief';
    import { getImageUrl } from '$lib/utils/api';
    import { t, locale } from '$lib/i18n';
  
    export let user;
  
    let dominantColor = 'rgba(55, 65, 81, 0.1)';  // 初始透明色
    let lightColor = '';
    let darkColor = '';
    const colorThief = new ColorThief();
  
    // 记录鼠标在卡片内的位置与计算出的半径
    let mouseX = 0;
    let mouseY = 0;
    let radius = 0;
    let spotlightBackground = '';
  
    // 处理鼠标移动事件
    function handleMouseMove(event) {
      const bounds = event.currentTarget.getBoundingClientRect();
      mouseX = event.clientX - bounds.left;
      mouseY = event.clientY - bounds.top;
      radius = Math.sqrt(bounds.width ** 2 + bounds.height ** 2) / 1.8;
      spotlightBackground = `radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, color-mix(in srgb, var(--card-color) 8%, transparent) 0%, transparent 80%)`;
    }
  
    // 处理鼠标进入事件
    function handleMouseEnter(event) {
      focusingFriendId.set(user.id.toString());
      handleMouseMove(event);
    }
  
    // 处理鼠标离开事件
    function handleMouseLeave() {
      focusingFriendId.set(null);
    }
  
    function formatJoinedDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString($locale === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: $locale === 'zh' ? 'long' : 'short'
      });
    }
  
    // 格式化统计数据
    function formatCount(count) {
      if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'k';
      }
      return count.toString();
    }
  
    // 添加 bio 处理函数
    function truncateBio(bio) {
        if (!bio) return '';
        return bio.length > 30 ? bio.slice(0, 30) + '...' : bio;
    }
  
    // 从头像提取颜色
    async function extractColors() {
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        const avatarUrl = getImageUrl(user.avatarUrl);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = avatarUrl;
        });
        
        const color = colorThief.getColor(img);
        dominantColor = 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')';
        
        // 生成亮色和暗色变体
        const r = color[0], g = color[1], b = color[2];
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        if (brightness > 128) {
          // 如果主色调较亮，加深它
          lightColor = 'rgb(' + (r * 0.8) + ', ' + (g * 0.8) + ', ' + (b * 0.8) + ')';
          darkColor = 'rgb(' + Math.min(r * 1.3, 255) + ', ' + Math.min(g * 1.3, 255) + ', ' + Math.min(b * 1.3, 255) + ')';
        } else {
          // 如果主色调较暗，提亮它
          lightColor = 'rgb(' + Math.min(r * 1.5, 255) + ', ' + Math.min(g * 1.5, 255) + ', ' + Math.min(b * 1.5, 255) + ')';
          darkColor = 'rgb(' + (r * 0.7) + ', ' + (g * 0.7) + ', ' + (b * 0.7) + ')';
        }
      } catch (e) {
        console.error('提取头像颜色失败:', e);
        // 使用默认颜色
        dominantColor = 'rgba(55, 65, 81, 0.8)';
        lightColor = 'rgba(55, 65, 81, 0.8)';
        darkColor = 'rgba(156, 163, 175, 0.8)';
      }
    }
  
    onMount(extractColors);
</script>
  
<TiltCard maxTilt={10} lerpSpeed={0.15} scale={1.05}>
  <div
    role="article"
    aria-label={$t('friendCard.userCard', { name: user.realName })}
    class="friend-card group relative not-prose h-[400px] flex flex-col rounded-2xl p-6
      border transition-all duration-300 backdrop-blur-md
      {$focusingFriendId && $focusingFriendId !== user.id.toString() ? 'md:opacity-80 md:blur-[1px]' : 'blur-none'}"
    style="--card-color: {dominantColor};
      --bg-base: white;
      --bg-mix: 98%;
      background-color: color-mix(in srgb, var(--bg-base) var(--bg-mix), var(--card-color));
      border-color: color-mix(in srgb, var(--card-color) 10%, transparent)"
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
    on:mousemove={handleMouseMove}
  >
    <!-- 光晕效果背景 -->
    <div
      class="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      style="background: {spotlightBackground}"
      aria-hidden="true"
    ></div>

    <!-- 头像 + 名称 + 简介 -->
    <header class="relative flex-1 flex flex-col items-center">
      <img
        src={getImageUrl(user.avatarUrl)}
        alt={user.realName}
        width="120"
        height="120"
        class="mx-auto h-24 w-24 rounded-full object-cover outline-none"
        crossorigin="anonymous"
      />
      <span class="mt-4 block text-center text-lg font-bold tracking-tight text-gray-500 dark:text-gray-400"
        style="color: var(--card-color)">
        {user.realName}
      </span>
      <span class="mt-1 block text-center text-sm leading-4 tracking-widest uppercase font-medium text-gray-400 dark:text-gray-500"
        style="color: color-mix(in srgb, var(--card-color) 70%, transparent)">
        @{user.username}
      </span>
      <div class="mt-3 h-8 flex items-center justify-center">
        {#if user.bio}
          <p class="text-center text-sm line-clamp-1 max-w-[240px] text-gray-400 dark:text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap"
            style="color: color-mix(in srgb, var(--card-color) 60%, transparent)">
            {truncateBio(user.bio)}
          </p>
        {/if}
      </div>
    </header>

    <!-- 统计信息 -->
    <div class="relative mb-6 flex justify-center gap-12">
      <div class="text-center">
        <span class="block text-2xl font-bold text-gray-500 dark:text-gray-400"
          style="color: var(--card-color)">
          {formatCount(user.articleCount)}
        </span>
        <span class="mt-1 block text-xs tracking-wider uppercase text-gray-400 dark:text-gray-500"
          style="color: color-mix(in srgb, var(--card-color) 50%, transparent)">
          {$t('friendCard.articles')}
        </span>
      </div>
      <div class="text-center">
        <span class="block text-2xl font-bold text-gray-500 dark:text-gray-400"
          style="color: var(--card-color)">
          {formatCount(user.commentCount)}
        </span>
        <span class="mt-1 block text-xs tracking-wider uppercase text-gray-400 dark:text-gray-500"
          style="color: color-mix(in srgb, var(--card-color) 50%, transparent)">
          {$t('friendCard.comments')}
        </span>
      </div>
    </div>

    <!-- 底部信息：加入时间 -->
    <footer class="relative mt-auto flex w-full items-center justify-between">
      <time
        class="select-none rounded-lg border p-2 text-xs tracking-wider text-gray-400 dark:text-gray-500"
        style="
          color: color-mix(in srgb, var(--card-color) 50%, transparent);
          border-color: color-mix(in srgb, var(--card-color) 30%, transparent);
          background-color: color-mix(in srgb, var(--card-color) 5%, transparent)
        "
      >
        {formatJoinedDate(user.createdAt)}
      </time>
    </footer>
  </div>
</TiltCard>
  
<style>
  .friend-card {
    border-width: 1px;
    border-color: rgba(0, 0, 0, 0.1);
  }
  
  .friend-card:hover {
    border-width: 1.5px;
  }

  div {
    --bg-base: white;
    --bg-mix: 98%;
  }

  @media (prefers-color-scheme: dark) {
    div {
      --bg-base: rgb(28, 25, 23);
      --bg-mix: 97%;
    }
    .friend-card {
      border-color: rgba(255, 255, 255, 0.1);
    }
  }
</style>  