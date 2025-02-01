<!-- NavigationMobile.svelte -->
<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { quartOut, quartIn } from 'svelte/easing';
  import { page } from '$app/stores';

  export let navigationItems = [
    { href: '/', text: '首页' },
    { href: '/about', text: '关于' },
    { href: '/contact', text: '联系' }
  ];

  let mobileMenuOpen = false;
  $: pathname = $page.url.pathname;

  function closeMenu() {
    mobileMenuOpen = false;
  }

  function toggleMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
</script>

<div class="relative">
  <!-- 切换按钮 -->
  <div class="mr-4">
    <button
      on:click={toggleMenu}
      class="group flex items-center rounded-full bg-gradient-to-b from-zinc-50/20 to-white/80 px-4 py-2 text-base font-medium text-zinc-800 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur-md focus:outline-none dark:from-zinc-900/30 dark:to-zinc-800/80 dark:text-zinc-200 dark:ring-white/10 dark:hover:ring-white/20"
    >
      前往
      <!-- 小箭头图标 -->
      <svg
        viewBox="0 0 8 6"
        aria-hidden="true"
        class="ml-3 h-auto w-2 stroke-zinc-500 group-hover:stroke-zinc-700 dark:group-hover:stroke-zinc-400"
      >
        <path
          d="M1.75 1.75L4 4.25l2.25-2.5"
          fill="none"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</div>

{#if mobileMenuOpen}
  <div class="fixed inset-0 z-[100]">
    <!-- 遮罩层，点击时关闭菜单 -->
    <div
      role="button"
      tabindex="0"
      on:click={closeMenu}
      on:keydown={e => e.key === 'Escape' && closeMenu()}
      class="absolute inset-0 bg-zinc-800/40 backdrop-blur dark:bg-black/80"
      in:fade={{ duration: 200 }}
      out:fade={{ duration: 150 }}
    ></div>

    <!-- 菜单面板 -->
    <div
      class="absolute inset-x-4 top-8 origin-top rounded-3xl bg-gradient-to-b from-zinc-100/75 to-white p-8 ring-1 ring-zinc-900/5 dark:from-zinc-900/50 dark:to-zinc-900 dark:ring-zinc-800"
      in:scale={{ start: 0.95, duration: 150, easing: quartOut }}
      out:scale={{ start: 0.95, duration: 150, easing: quartIn }}
    >
      <div class="flex flex-row-reverse items-center justify-between">
        <!-- 关闭按钮 -->
        <button
          aria-label="关闭菜单"
          on:click={closeMenu}
          class="-m-1 p-1"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            class="h-6 w-6 text-zinc-500 dark:text-zinc-400"
          >
            <path
              d="M17.25 6.75l-10.5 10.5M6.75 6.75l10.5 10.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <h2 class="text-sm font-medium text-zinc-600 dark:text-zinc-400">站内导航</h2>
      </div>
      <nav class="mt-6">
        <ul class="-my-2 divide-y divide-zinc-500/20 text-lg text-zinc-800 dark:divide-zinc-100/5 dark:text-zinc-300">
          {#each navigationItems as item (item.href)}
            <li>
              <a
                href={item.href}
                on:click={closeMenu}
                class="block py-2"
              >
                {item.text}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </div>
  </div>
{/if} 