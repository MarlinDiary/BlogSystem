<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import UserButton from '$lib/components/UserButton.svelte';

	// 导航数据
	const navigationItems = [
		{ href: '/', text: '首页' },
		{ href: '/articles', text: '文章' },
		{ href: '/about', text: '关于' }
	];
</script>

<div class="relative">
	<div class="px-4 sm:px-8 lg:px-12 pt-8">
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
	
	<div class="mt-4">
		<slot />
	</div>
</div>
