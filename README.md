# Wang Zizhe's Blog

This repository contains the source code and content for Wang Zizhe's personal blog.

## Development

The site has no runtime dependencies. `posts.js` is the canonical bilingual post index,
`content/posts/` contains article bodies, and `templates/home.html` and `templates/post.html` are the page shells.
`templates/footer.html` and `templates/theme-init.html` are shared by both.

```bash
npm run build  # regenerate homepages, article SEO, sitemap, and RSS feeds
npm run check  # verify generated files, links, post data, JavaScript syntax, and regression tests
```

Run `npm run build` after changing post metadata, article content, or templates. The generated
HTML remains fully usable without client-side JavaScript. Do not edit generated homepages
or `posts/*.html` directly. Builds remove HTML files under `posts/` that are no longer
in the post index; source fragments under `content/posts/` are preserved.
Calendar dates and links to removed articles are validated before output is changed.

## Copyright

All rights reserved.

Without prior written permission, no content in this repository or on the published site may be used for AI model training, fine-tuning, evaluation, or dataset construction.
