<script lang="ts">
	import '../app.css';
	import Navigation from '$lib/components/Navigation.svelte';

	// 导航数据
	const navigationItems = [
		{ href: '/', text: '首页' },
		{ href: '/articles', text: '文章' },
		{ href: '/about', text: '关于' }
	];
</script>

<div class="relative">
	<Navigation {navigationItems} />
	<div class="mt-4">
		<slot />
	</div>
</div>
