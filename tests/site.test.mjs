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
    assert.equal(fs.existsSync(path.join(f.dir, 'rss.xml')), false);
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

for (const phase of ['before first character', 'mid-animation', 'after completion', 'reduced motion']) {
  test(`hero retains full text after leaving: ${phase}`, () => {
    const original = 'Hello, world.';
    const classes = new Set();
    const hero = { textContent: original, classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) } };
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
    if (phase === 'mid-animation') tick();
    if (phase === 'after completion') while (timers.size) tick();
    events.pagehide?.({ persisted: true });
    assert.equal(hero.textContent, original);
    assert.equal(timers.size, 0);
    assert.equal(classes.has('typing'), false);
  });
}
