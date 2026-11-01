import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		csp: {
			directives: {
				'upgrade-insecure-requests': true // Required because most photos aren't served over HTTPS from NASA
			}
		},
		adapter: adapter()
	}
};

export default config;
