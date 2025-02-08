<!-- NavigationDesktop.svelte -->
<script>
  import { page } from '$app/stores';

  // 导航数据从父组件传入
  export let navigationItems = [
    { href: '/', text: '首页' },
    { href: '/about', text: '关于' },
    { href: '/contact', text: '联系' }
  ];

  // 记录鼠标在导航容器内的位置与计算出的半径
  let mouseX = 0;
  let mouseY = 0;
  let radius = 0;

  // 当前页面路径（SvelteKit 内置 store）
  $: pathname = $page.url.pathname;

  // 当鼠标移动时，更新相关数据
  function handleMouseMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    mouseX = event.clientX - bounds.left;
    mouseY = event.clientY - bounds.top;
    radius = Math.sqrt(bounds.width ** 2 + bounds.height ** 2) / 2.5;
  }

  // 生成聚光灯背景
  $: background = `radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, var(--spotlight-color) 0%, transparent 65%)`;

  // 计算链接的类名，当前激活项使用特殊颜色
  function navLinkClasses(isActive) {
    return `relative block whitespace-nowrap px-3 py-2 transition ${
      isActive
        ? 'text-lime-600 dark:text-lime-400'
        : 'hover:text-lime-600 dark:hover:text-lime-400'
    }`;
  }
</script>

<nav
  on:mousemove={handleMouseMove}
  class="group relative rounded-full bg-gradient-to-b from-zinc-50/70 to-white/90 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur-md dark:from-zinc-900/70 dark:to-zinc-800/90 dark:ring-zinc-100/10"
  style="--spotlight-color: rgb(236 252 203 / 0.6);"
>
  <!-- "聚光灯"效果背景：使用过渡与 group-hover 实现延迟出现 -->
  <div
    class="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
    style="background: {background};"
    aria-hidden="true"
  ></div>

  <ul class="flex bg-transparent px-3 text-base font-medium text-zinc-800 dark:text-zinc-200">
    {#each navigationItems as item (item.href)}
      <li>
        <a href={item.href} class={navLinkClasses(pathname === item.href)}>
          {item.text}
          {#if pathname === item.href}
            <!-- 当前页面下显示下划线效果 -->
            <span
              class="absolute inset-x-1 -bottom-px h-px bg-gradient-to-r from-lime-700/0 via-lime-700/70 to-lime-700/0 dark:from-lime-400/0 dark:via-lime-400/40 dark:to-lime-400/0"
            ></span>
          {/if}
        </a>
      </li>
    {/each}
  </ul>
</nav> 