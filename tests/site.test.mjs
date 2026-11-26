import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const context = { window: {} };
vm.runInNewContext(read('posts.js'), context);
const posts = context.window.BLOG_POSTS;

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const file of ['scripts', 'templates', 'content', 'assets', 'posts.js', 'styles.css', 'blog-index.js', 'theme-toggle.js', 'post-share.js']) {
    fs.cpSync(path.join(root, file), path.join(dir, file), { recursive: true });
  }
  return {
    dir,
    writePosts(value) { fs.writeFileSync(path.join(dir, 'posts.js'), `window.BLOG_POSTS = ${JSON.stringify(value)};`); },
    run(...args) { return spawnSync(process.execPath, ['scripts/build.mjs', ...args], { cwd: dir, encoding: 'utf8' }); }
  };
}

function success(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('build works without generated HTML; navigation and output are deterministic', (t) => {
  const f = fixture(t);
  success(f.run());
  for (const post of posts) {
    for (const lang of ['zh', 'en']) {
      const html = fs.readFileSync(path.join(f.dir, post[lang].href), 'utf8');
      assert.ok(html.includes(`class="post-back" href="${lang === 'en' ? '../en/' : '../'}"`));
      const other = lang === 'en' ? 'zh' : 'en';
      assert.ok(html.includes(`href="./${path.basename(post[other].href)}"`));
    }
  }
  success(f.run('--check'));
  success(f.run());
  success(f.run('--check'));
});

test('invalid calendar dates fail before output, including normalized February dates', (t) => {
  const f = fixture(t);
  for (const date of ['2026-13-99', '2026-02-29', '2026-04-31']) {
    f.writePosts([{ ...posts[0], date }]);
    for (const args of [[], ['--check']]) {
      const result = f.run(...args);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /invalid date/);
    }
    assert.equal(fs.existsSync(path.join(f.dir, 'sitemap.xml')), false);
  }
  f.writePosts([{ ...posts[0], date: '2024-02-29' }]);
  success(f.run());
});

test('check detects orphan pages and build removes only generated HTML', (t) => {
  const f = fixture(t);
  success(f.run());
  const keep = path.join(f.dir, 'posts', 'keep.txt');
  fs.writeFileSync(keep, 'keep');
  f.writePosts(posts.slice(1));
  const result = f.run('--check');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Orphaned generated articles/);
  assert.ok(fs.existsSync(path.join(f.dir, posts[0].zh.href)));
  success(f.run());
  for (const lang of ['zh', 'en']) {
    assert.equal(fs.existsSync(path.join(f.dir, posts[0][lang].href)), false);
    assert.ok(fs.existsSync(path.join(f.dir, 'content', posts[0][lang].href)));
  }
  assert.equal(fs.readFileSync(keep, 'utf8'), 'keep');
  success(f.run('--check'));
});

test('links to removed articles fail before the build deletes anything', (t) => {
  const f = fixture(t);
  success(f.run());
  f.writePosts(posts.slice(1));
  fs.appendFileSync(path.join(f.dir, 'content', posts[1].zh.href), `<a href="./${path.basename(posts[0].zh.href)}">old post</a>`);
  assert.notEqual(f.run().status, 0);
  assert.ok(fs.existsSync(path.join(f.dir, posts[0].zh.href)));
});

test('build and check report missing responsive image candidates', (t) => {
  const f = fixture(t);
  success(f.run());
  for (const width of [720, 1024]) {
    const file = `dixieland-festival-${width}.webp`;
    const asset = path.join(f.dir, 'assets', file);
    const saved = fs.readFileSync(asset);
    fs.unlinkSync(asset);
    for (const args of [[], ['--check']]) {
      const result = f.run(...args);
      assert.notEqual(result.status, 0);
      for (const suffix of ['', '-en']) {
        assert.ok(result.stderr.includes(`posts/2026-05-17-dixieland-jazz-festival${suffix}.html -> ../assets/${file}`));
      }
    }
    fs.writeFileSync(asset, saved);
  }
  success(f.run('--check'));
});

test('template values preserve dollar sequences and literal placeholder-like article text', (t) => {
  const f = fixture(t);
  const title = "Price $& $' $` <offer>";
  f.writePosts([{ ...posts[0], zh: { ...posts[0].zh, title } }]);
  fs.appendFileSync(path.join(f.dir, 'content', posts[0].zh.href), '<p>{{EXAMPLE}}</p>');
  success(f.run());
  const html = fs.readFileSync(path.join(f.dir, posts[0].zh.href), 'utf8');
  assert.ok(html.includes("Price $&amp; $' $` &lt;offer&gt;"));
  assert.ok(html.includes('<p>{{EXAMPLE}}</p>'));
});

test('theme follows saved changes in other tabs and on cached page restoration', () => {
  let savedTheme = 'light';
  let displayedTheme;
  const events = {};
  vm.runInNewContext(read('theme-toggle.js'), {
    document: {
      documentElement: { lang: 'en', setAttribute: (_, theme) => { displayedTheme = theme; } },
      querySelectorAll: () => []
    },
    localStorage: { getItem: () => savedTheme },
    window: {
      matchMedia: () => ({ matches: false, addEventListener() {} }),
      addEventListener: (name, callback) => { events[name] = callback; }
    }
  });

  assert.equal(displayedTheme, 'light');
  savedTheme = 'dark';
  events.storage({ key: 'theme' });
  assert.equal(displayedTheme, 'dark');

  savedTheme = 'light';
  events.pageshow({ persisted: true });
  assert.equal(displayedTheme, 'light');

  savedTheme = 'dark';
  events.pageshow({ persisted: true });
  savedTheme = null;
  events.storage({ key: null });
  assert.equal(displayedTheme, 'light');
});

test('hero skips typing when the animation elements are missing', () => {
  const original = 'Hello, world.';
  for (const elements of [{}, { '.hero-copy': { textContent: original } }, { '.hero-typing': { textContent: '' } }]) {
    const hero = { textContent: original, querySelector: (selector) => elements[selector] ?? null };
    vm.runInNewContext(read('blog-index.js'), {
      document: { querySelector: () => hero },
      window: {
        matchMedia: () => ({ matches: false }),
        setTimeout: () => assert.fail('Typing should not start without both elements')
      }
    });
    assert.equal(hero.textContent, original);
  }
});

for (const phase of ['before first character', 'mid-animation', 'after completion', 'reduced motion']) {
  test(`hero retains full text after leaving: ${phase}`, () => {
    const original = 'Hello, world.';
    const classes = new Set();
    const copy = { textContent: original };
    const overlay = { textContent: '' };
    const hero = {
      querySelector: (selector) => ({ '.hero-copy': copy, '.hero-typing': overlay })[selector],
      classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) }
    };
    const timers = new Map();
    const events = {};
    let id = 0;
    vm.runInNewContext(read('blog-index.js'), {
      document: { querySelector: () => hero },
      window: {
        matchMedia: () => ({ matches: phase === 'reduced motion' }),
        setTimeout(fn) { timers.set(++id, fn); return id; },
        clearTimeout(key) { timers.delete(key); },
        addEventListener(name, fn) { events[name] = fn; }
      }
    });
    function tick() {
      const [key, fn] = timers.entries().next().value;
      timers.delete(key);
      fn();
    }
    if (phase === 'mid-animation') {
      tick();
      assert.equal(overlay.textContent, 'H');
    }
    if (phase === 'after completion') while (timers.size) tick();
    assert.equal(copy.textContent, original);
    events.pagehide?.({ persisted: true });
    assert.equal(copy.textContent, original);
    assert.equal(overlay.textContent, '');
    assert.equal(timers.size, 0);
    assert.equal(classes.has('typing'), false);
  });
}

test('language transitions only animate navigation to the paired translation', async () => {
  const source = [...read('templates/theme-init.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  const pairedUrl = 'https://example.com/posts/article-en.html';
  for (const eventName of ['pageswap', 'pagereveal']) {
    for (const [otherUrl, reducedMotion, expected] of [
      [pairedUrl, false, true],
      ['https://example.com/', false, false],
      ['https://example.com/posts/another.html', false, false],
      [undefined, false, false],
      [pairedUrl, true, false]
    ]) {
      const events = {};
      const label = { style: {} };
      let finish;
      let skipped = false;
      const transition = {
        finished: new Promise(resolve => { finish = resolve; }),
        skipTransition() { skipped = true; }
      };
      vm.runInNewContext(source, {
        document: { querySelector: () => ({ href: pairedUrl, querySelector: () => label }) },
        window: {
          matchMedia: () => ({ matches: reducedMotion }),
          navigation: { activation: { from: { url: otherUrl } } },
          addEventListener(name, handler) { events[name] = handler; }
        }
      });
      events[eventName]({ viewTransition: transition, activation: { entry: { url: otherUrl } } });
      assert.equal(skipped, !expected, `${eventName}: ${otherUrl}`);
      assert.equal(label.style.viewTransitionName, expected ? 'language-label' : undefined);
      finish();
      await transition.finished;
      if (expected) assert.equal(label.style.viewTransitionName, '');
      events[eventName]({}); // Unsupported browsers must keep normal navigation working.
    }
  }
});
