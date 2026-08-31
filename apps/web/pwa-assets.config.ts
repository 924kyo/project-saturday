import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  images: ['public/maskable-icon.svg'],
  preset: {
    ...preset,
    apple: {
      ...preset.apple,
      padding: 0,
      resizeOptions: {
        background: '#071522',
        fit: 'contain',
      },
    },
    maskable: {
      ...preset.maskable,
      padding: 0,
      resizeOptions: {
        background: '#071522',
        fit: 'contain',
      },
    },
  },
});
