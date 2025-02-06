import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

export default {
	content: ['./src/**/*.{html,js,svelte}'],

	theme: {
		extend: {}
	},

	plugins: [typography, forms]
}; 