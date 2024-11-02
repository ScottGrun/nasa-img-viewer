import aspectRatio from '@tailwindcss/aspect-ratio';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Noto Sans Variable']
			},
			backgroundImage: {
				'masonary-image-gradient':
					'linear-gradient(0deg, hsla(0, 0%, 0%, 0.804) 0%, hsla(0, 0%, 100%, 0) 100%)'
			}
		}
	},

	plugins: [typography, forms, aspectRatio]
} as Config;
