# Wang Zizhe's Blog

This repository contains the source code and content for Wang Zizhe's personal blog.

## Development

The site has no runtime dependencies. `posts.js` is the canonical bilingual post index,
`content/posts/` contains article bodies, and `templates/post.html` is the shared article shell.

```bash
npm run build  # regenerate homepages, article SEO, sitemap, and RSS feeds
npm run check  # verify generated files, links, post data, and JavaScript syntax
```

Run `npm run build` after changing post metadata, article content, or templates. The generated
HTML remains fully usable without client-side JavaScript.

## Copyright

All rights reserved.

Without prior written permission, no content in this repository or on the published site may be used for AI model training, fine-tuning, evaluation, or dataset construction.
