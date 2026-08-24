# Link previews (WhatsApp, iMessage, Slack)

Crawlers such as WhatsApp read **static** tags in `index.html`, not the React app. Those tags describe Foro and point at `public/og-image.png` (1200×630).

| Tag | Purpose |
|-----|---------|
| `meta name="description"` | Fallback description |
| `og:title` / `og:description` | Title and body in the preview card |
| `og:image` | Preview image |

Set `VITE_SITE_URL` (no trailing slash) at **build** time so `og:image` is an absolute `https://…` URL. WhatsApp often ignores relative image paths.

After changing copy or the image, re-scrape with [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) (WhatsApp uses the same cache).
