<!-- Navigation.svelte -->
<script>
  import NavigationMobile from './NavigationMobile.svelte';
  import NavigationDesktop from './NavigationDesktop.svelte';

  // 导航数据可以从父组件传入
  export let navigationItems = [
    { href: '/', text: '首页' },
    { href: '/articles', text: '文章' },
    { href: '/about', text: '关于' }
  ];
</script>

<div class="flex flex-1 justify-end md:justify-center">
  <!-- 移动端导航 -->
  <div class="pointer-events-auto relative z-50 md:hidden">
    <NavigationMobile {navigationItems} />
  </div>
  
  <!-- 桌面端导航 -->
  <div class="pointer-events-auto relative z-50 hidden md:block">
    <NavigationDesktop {navigationItems} />
  </div>
</div> 