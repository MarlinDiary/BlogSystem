<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';

	// 导航数据
	const navigationItems = [
		{ href: '/', text: '首页' },
		{ href: '/articles', text: '文章' },
		{ href: '/search', text: '搜索' },
		{ href: '/publish', text: '发布' },
		{ href: '/about', text: '关于' }
	];
</script>

<div class="relative">
	<!-- 1. 网格背景 -->
	<div class="pointer-events-none fixed inset-0 select-none bg-[url('/grid-black.svg')] bg-top bg-repeat dark:bg-[url('/grid.svg')]"></div>
	
	<!-- 2. 顶部渐变光晕 -->
	<div class="pointer-events-none fixed top-0 block h-[800px] w-full select-none bg-[radial-gradient(103.72%_46.58%_at_50%_0%,rgba(5,5,5,0.045)_0%,rgba(0,0,0,0)_100%)] dark:bg-[radial-gradient(103.72%_46.58%_at_50%_0%,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0)_100%)]"></div>

	<!-- 3. 半透明背景 -->
	<div class="fixed inset-0">
		<div class="h-full w-full bg-zinc-50/40 dark:bg-zinc-900/70"></div>
	</div>

	<!-- 主要内容 -->
	<div class="relative">
		<Header {navigationItems} />
		<main class="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-12">
			<slot />
		</main>
	</div>
</div>
