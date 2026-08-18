import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const siteUrl = "https://wangzizhe.github.io";
const generatedStart = "<!-- GENERATED:SEO:START -->";
const generatedEnd = "<!-- GENERATED:SEO:END -->";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll("'", "&apos;");
}

function loadPosts() {
  const context = { window: {} };
  vm.runInNewContext(read("posts.js"), context, { filename: "posts.js" });
  return context.window.BLOG_POSTS;
}

function validatePosts(posts) {
  const errors = [];
  const hrefs = new Set();

  if (!Array.isArray(posts) || posts.length === 0) {
    return ["posts.js must define a non-empty window.BLOG_POSTS array"];
  }

  posts.forEach((post, index) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date || "")) {
      errors.push(`post ${index + 1}: invalid date`);
    }
    if (index > 0 && posts[index - 1].date < post.date) {
      errors.push(`post ${index + 1}: posts must be ordered newest first`);
    }

    for (const lang of ["zh", "en"]) {
      const localized = post[lang];
      if (!localized?.title || !localized?.href) {
        errors.push(`post ${index + 1}: missing ${lang} title or href`);
        continue;
      }
      if (hrefs.has(localized.href)) {
        errors.push(`duplicate href: ${localized.href}`);
      }
      hrefs.add(localized.href);
      if (!fs.existsSync(path.join(root, "content", localized.href))) {
        errors.push(`missing article source: content/${localized.href}`);
      }
    }
  });

  return errors;
}

function renderCards(posts, lang, prefix) {
  const readMore = lang === "zh" ? "继续阅读" : "Read More";
  return posts
    .map((post) => {
      const localized = post[lang];
      const summary = localized.summary
        ? `\n            <p>${escapeHtml(localized.summary)}</p>`
        : "";
      return `          <article class="post-card">
            <time class="meta" datetime="${post.date}">${post.date}</time>
            <h2>${escapeHtml(localized.title)}</h2>${summary}
            <a href="${prefix}${escapeHtml(localized.href)}">${readMore}</a>
          </article>`;
    })
    .join("\n");
}

function updatePostGrid(html, cards) {
  const block = `<div class="post-grid" id="postGrid">
${cards}
        </div>`;
  if (!/<div class="post-grid" id="postGrid">[\s\S]*?<\/div>/.test(html)) {
    throw new Error("Could not find #postGrid");
  }
  return html.replace(/<div class="post-grid" id="postGrid">[\s\S]*?<\/div>/, block);
}

function jsonLd(data) {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}

function homeSeo(lang) {
  const english = lang === "en";
  const url = `${siteUrl}${english ? "/en/" : "/"}`;
  const title = english ? "Wang Zizhe | Personal Blog" : "Wang Zizhe | 个人博客";
  const description = english
    ? "Wang Zizhe’s personal blog on startup insights and reflections on life."
    : "Wang Zizhe 的个人博客，记录创业思考与生活观察。";
  const locale = english ? "en_US" : "zh_CN";
  const alternateLocale = english ? "zh_CN" : "en_US";
  return `    ${generatedStart}
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="zh-CN" href="${siteUrl}/" />
    <link rel="alternate" hreflang="en" href="${siteUrl}/en/" />
    <link rel="alternate" hreflang="x-default" href="${siteUrl}/" />
    <link rel="alternate" type="application/rss+xml" title="${escapeHtml(title)}" href="${url}rss.xml" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="${locale}" />
    <meta property="og:locale:alternate" content="${alternateLocale}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <script type="application/ld+json">${jsonLd({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: title,
      url,
      inLanguage: english ? "en" : "zh-CN"
    })}</script>
    ${generatedEnd}`;
}

function articleSeo(post, lang, pageDescription) {
  const localized = post[lang];
  const otherLang = lang === "zh" ? "en" : "zh";
  const url = `${siteUrl}/${localized.href}`;
  const alternateUrl = `${siteUrl}/${post[otherLang].href}`;
  const zhUrl = `${siteUrl}/${post.zh.href}`;
  const description = localized.summary || pageDescription || localized.title;
  const language = lang === "zh" ? "zh-CN" : "en";
  return `    ${generatedStart}
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="${language}" href="${url}" />
    <link rel="alternate" hreflang="${lang === "zh" ? "en" : "zh-CN"}" href="${alternateUrl}" />
    <link rel="alternate" hreflang="x-default" href="${zhUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(localized.title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="${lang === "zh" ? "zh_CN" : "en_US"}" />
    <meta property="article:published_time" content="${post.date}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(localized.title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <script type="application/ld+json">${jsonLd({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: localized.title,
      description,
      datePublished: post.date,
      inLanguage: language,
      url,
      author: { "@type": "Person", name: "Wang Zizhe" }
    })}</script>
    ${generatedEnd}`;
}

function renderArticlePage(template, post, lang) {
  const english = lang === "en";
  const localized = post[lang];
  const description = localized.summary || localized.title;
  const body = read(path.join("content", localized.href))
    .trimEnd()
    .split("\n")
    .map((line) => (line ? `        ${line}` : ""))
    .join("\n");
  const values = {
    LANG: english ? "en" : "zh-CN",
    PAGE_TITLE: escapeHtml(`${post.date} ${localized.title} | Wang Zizhe`),
    DESCRIPTION: escapeHtml(description),
    SEO: articleSeo(post, lang, description),
    BACK_LABEL: english ? "← Back to Home" : "← 返回首页",
    DATE: post.date,
    POST_TITLE: escapeHtml(localized.title),
    ZH_FILE: path.basename(post.zh.href),
    EN_FILE: path.basename(post.en.href),
    ZH_ACTIVE: english ? "" : " is-active",
    EN_ACTIVE: english ? " is-active" : "",
    ZH_CURRENT: english ? "" : ' aria-current="page"',
    EN_CURRENT: english ? ' aria-current="page"' : "",
    ARTICLE_BODY: body,
    SHARE_LABEL: english ? "Share this article" : "分享这篇文章",
    NOTICE_LINE_1: english
      ? "Without prior written permission, no content on this site"
      : "未经书面授权，禁止将本站任何内容",
    NOTICE_LINE_2: english
      ? "may be used for AI model training, fine-tuning, evaluation, or dataset construction."
      : "用于人工智能模型训练、微调、评测或数据集构建。"
  };

  let html = template;
  for (const [key, value] of Object.entries(values)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  const unresolved = html.match(/{{[A-Z0-9_]+}}/g);
  if (unresolved) throw new Error(`Unresolved template values: ${unresolved.join(", ")}`);
  return html;
}

function injectSeo(html, block) {
  if (html.includes(generatedStart)) {
    return html.replace(
      new RegExp(`${generatedStart}[\\s\\S]*?${generatedEnd}`),
      block.trim()
    );
  }

  const withoutOldLinks = html.replace(
    /^\s*<link rel="(?:canonical|alternate)"[^>]*\/>\s*$/gm,
    ""
  );
  const description = /<meta\s+name="description"[\s\S]*?\/>/;
  if (!description.test(withoutOldLinks)) {
    throw new Error("Could not find description metadata");
  }
  return withoutOldLinks.replace(description, (match) => `${match}\n${block}`);
}

function sitemap(posts) {
  const urls = [
    { loc: `${siteUrl}/`, lastmod: posts[0].date },
    { loc: `${siteUrl}/en/`, lastmod: posts[0].date },
    ...posts.flatMap((post) => [
      { loc: `${siteUrl}/${post.zh.href}`, lastmod: post.date },
      { loc: `${siteUrl}/${post.en.href}`, lastmod: post.date }
    ])
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(({ loc, lastmod }) => `  <url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}
</urlset>
`;
}

function rss(posts, lang) {
  const english = lang === "en";
  const baseUrl = `${siteUrl}${english ? "/en/" : "/"}`;
  const title = english ? "Wang Zizhe | Personal Blog" : "Wang Zizhe | 个人博客";
  const description = english
    ? "Thoughts on technology, products, startups, and life."
    : "关于技术、产品、创业与生活的思考。";
  const items = posts.map((post) => {
    const localized = post[lang];
    const url = `${siteUrl}/${localized.href}`;
    return `    <item>
      <title>${escapeXml(localized.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeXml(localized.summary || localized.title)}</description>
    </item>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml(description)}</description>
    <language>${english ? "en" : "zh-CN"}</language>
${items}
  </channel>
</rss>
`;
}

function expectedFiles(posts) {
  const files = new Map();
  const articleTemplate = read("templates/post.html");
  for (const [file, lang, prefix] of [
    ["index.html", "zh", ""],
    ["en/index.html", "en", "../"]
  ]) {
    let html = read(file);
    html = updatePostGrid(html, renderCards(posts, lang, prefix));
    html = injectSeo(html, homeSeo(lang));
    files.set(file, html);
  }

  for (const post of posts) {
    for (const lang of ["zh", "en"]) {
      const file = post[lang].href;
      files.set(file, renderArticlePage(articleTemplate, post, lang));
    }
  }

  files.set("sitemap.xml", sitemap(posts));
  files.set("rss.xml", rss(posts, "zh"));
  files.set("en/rss.xml", rss(posts, "en"));
  return files;
}

function verifyLocalReferences(files) {
  const errors = [];
  for (const [file, content] of files) {
    if (!file.endsWith(".html")) continue;
    for (const match of content.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const value = match[1].split(/[?#]/)[0];
      if (!value || /^(?:https?:|mailto:|tel:|data:)/.test(value)) continue;
      const target = path.resolve(root, path.dirname(file), value);
      if (!fs.existsSync(target) && !files.has(path.relative(root, target))) {
        errors.push(`${file} -> ${match[1]}`);
      }
    }
  }
  return errors;
}

const posts = loadPosts();
const errors = validatePosts(posts);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const files = expectedFiles(posts);
const referenceErrors = verifyLocalReferences(files);
if (referenceErrors.length) {
  console.error(referenceErrors.join("\n"));
  process.exit(1);
}

const stale = [];
for (const [file, expected] of files) {
  const fullPath = path.join(root, file);
  const current = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : null;
  if (current === expected) continue;
  if (checkOnly) stale.push(file);
  else fs.writeFileSync(fullPath, expected);
}

if (stale.length) {
  console.error(`Generated files are stale:\n${stale.join("\n")}\nRun: node scripts/build.mjs`);
  process.exit(1);
}

console.log(checkOnly ? "Generated files and links are valid." : `Generated ${files.size} files.`);
