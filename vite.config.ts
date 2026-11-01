import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			// Consult https://svelte.dev/docs/kit/integrations
			// for more information about preprocessors
			preprocess: vitePreprocess(),

			csp: {
				directives: {
					'upgrade-insecure-requests': true /* Required because most photos aren't served over HTTPS from NASA */
				}
			},
			adapter: adapter()
		})
	],
	test: { include: ['src/**/*.{test,spec}.{js,ts}'] }
});
