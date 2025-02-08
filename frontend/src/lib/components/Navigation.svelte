<!-- Navigation.svelte -->
<script>
  import NavigationMobile from './NavigationMobile.svelte';
  import NavigationDesktop from './NavigationDesktop.svelte';
  import { t } from '$lib/i18n';

  // 导航数据可以从父组件传入，但现在使用i18n翻译
  export let navigationItems = [
    { href: '/', key: 'nav.home' },
    { href: '/articles', key: 'nav.articles' },
    { href: '/about', key: 'nav.about' }
  ];

  // 添加翻译到i18n字典
  $: translatedItems = navigationItems.map(item => {
    const translation = $t(item.key);
    return {
      ...item,
      text: translation || (item.key === 'nav.home' ? '首页' : 
            item.key === 'nav.articles' ? '文章' : 
            item.key === 'nav.about' ? '关于' : item.key)
    };
  });
</script>

<div class="flex flex-1 justify-end md:justify-center">
  <!-- 移动端导航 -->
  <div class="pointer-events-auto relative z-50 md:hidden">
    <NavigationMobile navigationItems={translatedItems} />
  </div>
  
  <!-- 桌面端导航 -->
  <div class="pointer-events-auto relative z-50 hidden md:block">
    <NavigationDesktop navigationItems={translatedItems} />
  </div>
</div> 