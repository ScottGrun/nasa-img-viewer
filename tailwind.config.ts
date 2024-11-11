import aspectRatio from '@tailwindcss/aspect-ratio';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter Variable', ...defaultTheme.fontFamily.sans],
				mono: ['DM Mono', ...defaultTheme.fontFamily.mono]
			},
			colors: {
				'primary-dark': '#1b1b1b',
				'nasa-blue': '#0000ee',
				'nasa-red': '#f64137'
			},
			backgroundImage: {
				'masonary-image-gradient':
					'linear-gradient(0deg, hsla(0, 0%, 0%, 0.804) 0%, hsla(0, 0%, 100%, 0) 100%)'
			}
		}
	},

	plugins: [typography, forms, aspectRatio]
} as Config;
