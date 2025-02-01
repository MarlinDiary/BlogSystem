<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import UserButton from '$lib/components/UserButton.svelte';

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
		<div class="mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
			<div class="pt-8">
				<div class="flex items-center">
					<!-- Logo/头像容器 -->
					<div class="flex flex-1">
						<a href="/" class="pointer-events-auto relative z-50 block h-10 w-10 rounded-full bg-white/90 p-0.5 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur dark:bg-zinc-800/90 dark:ring-white/10">
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
						<div class="pointer-events-auto flex items-center gap-3">
							<UserButton />
							<ThemeSwitcher />
						</div>
					</div>
				</div>
			</div>
			
			<main class="py-8">
				<slot />
			</main>
		</div>
	</div>
</div>
