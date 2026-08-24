import path from 'node:path'
import type { Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Prefix OG/Twitter image URLs so WhatsApp and similar crawlers get an absolute https URL. */
function siteOriginHtmlPlugin(origin: string): Plugin {
  const trimmed = origin.replace(/\/$/, '')
  return {
    name: 'site-origin-html',
    transformIndexHtml(html) {
      if (!trimmed) return html
      return html
        .replaceAll('content="/og-image.png"', `content="${trimmed}/og-image.png"`)
        .replace(
          '<meta property="og:type" content="website" />',
          `<meta property="og:type" content="website" />\n    <meta property="og:url" content="${trimmed}/" />`,
        )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    server: {
      port: 5178,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@stores': path.resolve(__dirname, './src/stores'),
        '@utils': path.resolve(__dirname, './src/utils'),
      },
    },
    plugins: [
      siteOriginHtmlPlugin(env.VITE_SITE_URL || process.env.VITE_SITE_URL || ''),
      tailwindcss(),
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
  }
})
