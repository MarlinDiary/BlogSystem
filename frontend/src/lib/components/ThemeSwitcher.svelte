<!-- ThemeSwitcher.svelte -->
<script>
  import { onMount } from 'svelte';
  import Moon from './icons/Moon.svelte';
  import Sun from './icons/Sun.svelte';
  import '../styles/icon.css';
  
  let theme = 'light';
  let mounted = false;
  
  onMount(() => {
    mounted = true;
    // 检查系统主题偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      theme = savedTheme;
    } else {
      theme = prefersDark ? 'dark' : 'light';
    }
    
    // 根据主题设置类名
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  });
  
  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    
    // 保存主题设置
    localStorage.setItem('theme', theme);
    
    // 更新暗色模式
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
</script>

{#if mounted}
  <button
    type="button"
    aria-label="切换颜色主题"
    class="group h-10 rounded-full bg-white/90 px-3 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur transition dark:bg-zinc-800/90 dark:ring-white/10 dark:hover:ring-white/20"
    on:click={toggleTheme}
  >
    {#if theme === 'dark'}
      <Sun className="h-6 w-6 stroke-zinc-500 transition group-hover:stroke-zinc-700 dark:group-hover:stroke-zinc-200" />
    {:else}
      <Moon className="h-6 w-6 stroke-zinc-500 transition group-hover:stroke-zinc-700 dark:group-hover:stroke-zinc-200" />
    {/if}
  </button>
{/if} 