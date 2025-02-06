<script>
  import { onMount } from 'svelte';
  import Navigation from './Navigation.svelte';
  import SearchButton from './SearchButton.svelte';
  import UserButton from './UserButton.svelte';
  
  export let navigationItems;
  
  let lastScrollY = 0;
  let headerRef;
  
  function handleScroll() {
    if (!headerRef) return;
    
    const currentScrollY = window.scrollY;
    
    // 向下滚动超过50px时隐藏，向上滚动时显示
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
      headerRef.style.transform = 'translateY(-100%)';
    } else {
      headerRef.style.transform = 'translateY(0)';
    }
    
    lastScrollY = currentScrollY;
  }
  
  onMount(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  });
</script>

<header 
  bind:this={headerRef}
  class="fixed top-0 left-0 right-0 z-50 transition-transform duration-300"
>
  <div class="mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
    <div class="flex h-16 items-center justify-between">
      <!-- Logo/头像容器 -->
      <div class="flex flex-1">
        <a href="/" class="block h-10 w-10 rounded-full bg-white p-0.5 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 dark:bg-zinc-800 dark:ring-white/10">
          <img
            src="/logo.png"
            alt="网站Logo"
            class="h-9 w-9 rounded-full bg-zinc-100 object-cover dark:bg-zinc-800"
          />
        </a>
      </div>
      
      <!-- 导航部分 -->
      <div class="flex flex-1 justify-end md:justify-center">
        <Navigation {navigationItems} />
      </div>

      <!-- 右侧按钮组 -->
      <div class="flex items-center justify-end md:flex-1">
        <div class="flex items-center gap-3">
          <UserButton />
          <SearchButton />
        </div>
      </div>
    </div>
  </div>
</header>

<!-- 占位元素，防止内容被固定定位的header遮挡 -->
<div class="h-16"></div> 