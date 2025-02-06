import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$lib: '/src/lib'
		}
	},
	ssr: {
		noExternal: ['marked']
	},
	build: {
		rollupOptions: {
			external: ['marked']
		}
	},
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path
			},
			'/uploads': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				secure: false
			}
		}
	}
}); 