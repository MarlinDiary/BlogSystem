import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$lib: '/src/lib'
		}
	},
	server: {
		proxy: {
			'/api': {
				target: process.env.NODE_ENV === 'production' 
					? 'https://blog-production-154c.up.railway.app'
					: 'http://localhost:3000',
				changeOrigin: true,
				secure: true,
				rewrite: (path) => path
			},
			'/uploads': {
				target: process.env.NODE_ENV === 'production'
					? 'https://blog-production-154c.up.railway.app'
					: 'http://localhost:3000',
				changeOrigin: true,
				secure: true
			}
		}
	}
}); 