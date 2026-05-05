import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://epatri.vercel.app',
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()]
  },
  output: 'server',
  adapter: vercel(),
});
