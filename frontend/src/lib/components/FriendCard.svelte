<script lang="ts">
    import { focusingFriendId } from '$lib/stores/friend';
    import TiltCard from './TiltCard.svelte';
    import type { User } from '$lib/types/user';
    import { onMount } from 'svelte';
    import ColorThief from 'colorthief';
  
    export let user: User;
  
    let dominantColor = '';
    let lightColor = '';
    let darkColor = '';
    const colorThief = new ColorThief();
  
    // 记录鼠标在卡片内的位置与计算出的半径
    let mouseX = 0;
    let mouseY = 0;
    let radius = 0;
    let spotlightBackground = '';
  
    // 处理鼠标移动事件
    function handleMouseMove(event: MouseEvent) {
      const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
      mouseX = event.clientX - bounds.left;
      mouseY = event.clientY - bounds.top;
      radius = Math.sqrt(bounds.width ** 2 + bounds.height ** 2) / 1.8;
      spotlightBackground = `radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, color-mix(in srgb, var(--card-color) 8%, transparent) 0%, transparent 80%)`;
    }
  
    // 处理鼠标进入事件
    function handleMouseEnter(event: MouseEvent) {
      focusingFriendId.set(user.id.toString());
      handleMouseMove(event);
    }
  
    // 处理鼠标离开事件
    function handleMouseLeave() {
      focusingFriendId.set(null);
    }
  
    function formatJoinedDate(dateString: string): string {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'long'
      });
    }
  
    // 格式化统计数据
    function formatCount(count: number): string {
      if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'k';
      }
      return count.toString();
    }
  
    // 从头像提取颜色
    async function extractColors() {
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = user.avatarUrl;
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
        dominantColor = '#374151';
        lightColor = '#374151';
        darkColor = '#9CA3AF';
      }
    }
  
    onMount(extractColors);
  </script>
  
  <TiltCard maxTilt={10} lerpSpeed={0.15} scale={1.05}>
    <div
      role="article"
      aria-label="{user.realName}的个人卡片"
      class="friend-card group relative not-prose flex flex-col justify-between rounded-2xl p-6
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
      <header class="relative mb-6 flex flex-col items-center">
        <img
          src={user.avatarUrl}
          alt={user.realName}
          width="120"
          height="120"
          class="mx-auto h-24 w-24 rounded-full object-cover outline-none"
          crossorigin="anonymous"
        />
        <span class="mt-4 block text-center text-lg font-bold tracking-tight"
          style="color: var(--card-color)">
          {user.realName}
        </span>
        <span class="mt-1 block text-center text-sm leading-4 tracking-widest uppercase font-medium"
          style="color: color-mix(in srgb, var(--card-color) 70%, transparent)">
          @{user.username}
        </span>
        {#if user.bio}
          <p class="mt-3 text-center text-sm line-clamp-2 max-w-[85%]"
            style="color: color-mix(in srgb, var(--card-color) 60%, transparent)">
            {user.bio}
          </p>
        {/if}
      </header>
  
      <!-- 统计信息 -->
      <div class="relative mb-6 flex justify-center gap-12">
        <div class="text-center">
          <span class="block text-2xl font-bold"
            style="color: var(--card-color)">
            {formatCount(user.articleCount)}
          </span>
          <span class="mt-1 block text-xs tracking-wider uppercase"
            style="color: color-mix(in srgb, var(--card-color) 50%, transparent)">
            文章
          </span>
        </div>
        <div class="text-center">
          <span class="block text-2xl font-bold"
            style="color: var(--card-color)">
            {formatCount(user.commentCount)}
          </span>
          <span class="mt-1 block text-xs tracking-wider uppercase"
            style="color: color-mix(in srgb, var(--card-color) 50%, transparent)">
            评论
          </span>
        </div>
      </div>
  
      <!-- 底部信息：加入时间 -->
      <footer class="relative mt-auto flex w-full items-center justify-between">
        <time
          class="select-none rounded-lg border p-2 text-xs tracking-wider"
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
    }
    
    .friend-card:hover {
      border-width: 1.5px;
      border-color: color-mix(in srgb, var(--card-color) 35%, transparent);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--card-color) 15%, transparent);
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
    }
  </style>  