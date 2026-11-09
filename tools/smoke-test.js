#!/usr/bin/env node
/**
 * DY Deyu - headless smoke test (no browser / no npm dependencies).
 *
 * Boots js/app.js inside a minimal DOM stub and renders every route in EN
 * and ZH, in both HTTP mode and offline (double-clicked file://) mode.
 * Verifies content, 12-per-page pagination, product detail sections,
 * bilingual switching, asset paths and the absence of runtime errors.
 *
 * Run:  node tools/smoke-test.js
 *       node tools/smoke-test.js --offline     # only file:// mode
 *       node tools/smoke-test.js --all         # both modes (default)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const APP = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const MODE = process.argv.includes('--offline') ? 'offline'
  : (process.argv.includes('--http') ? 'http' : 'all');

let OFFLINE = false;
let linkHrefs = [];

function loadOfflineData() {
  const src = fs.readFileSync(path.join(ROOT, 'content', 'offline-data.js'), 'utf8');
  const marker = 'window.__DY_OFFLINE_DATA__ = ';
  const i = src.indexOf(marker);
  if (i < 0) throw new Error('content/offline-data.js is invalid; run tools/gen_offline_data.py');
  return JSON.parse(src.slice(i + marker.length).trim().replace(/;\s*$/, ''));
}

/* Collect hrefs written by hydrateLinks() to check routing mode. */
function fakeLinks(html) {
  const out = [];
  const re = /<a\b[^>]*\bdata-link="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const value = m[1];
    out.push({
      _v: value,
      getAttribute(k) { return k === 'data-link' ? this._v : null; },
      setAttribute(k, v) { if (k === 'href') linkHrefs.push(String(v)); }
    });
  }
  return out;
}

function el() {
  return {
    innerHTML: '',
    attrs: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k] || null; },
    querySelector() { return null; },
    querySelectorAll(sel) { return sel === 'a[data-link]' ? fakeLinks(this.innerHTML) : []; },
    addEventListener() {}
  };
}

function boot(route, lang) {
  linkHrefs = [];
  const nodes = {
    '#app': el(), '#site-header': el(), '#site-footer': el(),
    '#lightbox': el(), '#lightbox-img': el(), '#gallery-main-img': el(),
    'meta[name="description"]': el()
  };
  const handlers = {};
  const sandbox = {
    console: { log() {}, error: (...a) => { throw new Error('console.error: ' + a.join(' ')); }, warn() {} },
    setTimeout, clearTimeout,
    document: {
      documentElement: { lang: '' },
      body: { classList: { add() {}, remove() {} } },
      querySelector(sel) { return nodes[sel] || null; },
      querySelectorAll(sel) {
        if (sel !== 'a[data-link]') return [];
        return fakeLinks(nodes['#app'].innerHTML + nodes['#site-header'].innerHTML + nodes['#site-footer'].innerHTML);
      },
      addEventListener(type, fn) { handlers[type] = fn; }
    },
    localStorage: { getItem: k => (k === 'dy-lang' ? lang : null), setItem() {} },
    history: {
      pushState() { if (OFFLINE) throw new Error('pushState must not run in file:// mode'); }
    },
    fetch(p) {
      if (OFFLINE) return Promise.reject(new Error('fetch() must not run in file:// mode'));
      const file = path.join(ROOT, p.replace(/^\//, ''));
      if (!fs.existsSync(file)) return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('missing')) });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(fs.readFileSync(file, 'utf8'))) });
    },
    IntersectionObserver: class { constructor() {} observe() {} unobserve() {} disconnect() {} }
  };
  sandbox.window = sandbox;
  sandbox.window.location = {
    protocol: OFFLINE ? 'file:' : 'http:',
    pathname: OFFLINE ? '/C:/dy-deyu-site/index.html' : route,
    hash: OFFLINE ? '#' + route : ''
  };
  sandbox.window.scrollY = 0;
  sandbox.window.scrollTo = () => {};
  sandbox.window.addEventListener = (type, fn) => { handlers[type] = fn; };
  sandbox.window.location.replace = () => {};
  if (OFFLINE) sandbox.__DY_OFFLINE_DATA__ = loadOfflineData();
  vm.createContext(sandbox);
  vm.runInContext(APP, sandbox, { filename: 'app.js' });
  return new Promise(resolve => setTimeout(() => resolve({
    html: nodes['#app'].innerHTML,
    header: nodes['#site-header'].innerHTML,
    footer: nodes['#site-footer'].innerHTML,
    title: sandbox.document.title,
    links: linkHrefs.slice(),
    hashHandler: !!handlers.hashchange,
    popHandler: !!handlers.popstate
  }), 120));
}

function count(s, needle) { return s.split(needle).length - 1; }

const CASES = [
  { route: '/', en: 'A human hair factory', zh: '真人发工厂', expect: ['category-card', 'stats-strip', 'cta-band'] },
  { route: '/products', en: 'Collections', zh: '产品中心', expect: ['category-card'] },
  { route: '/products/wigs', en: 'Human Hair Wigs', zh: '真人发头套', expect: ['product-card', 'pagination', 'class="count"'] },
  { route: '/products/wigs/2', en: 'Human Hair Wigs', zh: '真人发头套', expect: ['product-card', 'pagination'] },
  { route: '/products/wefts', en: 'Hair Wefts', zh: '发帘', expect: ['product-card', 'pagination'] },
  { route: '/product/DY-WG-001', en: '13x4 Lace Front Wig', zh: '蕾丝前额头套', expect: ['gallery-thumbs', 'video-slot', 'bilingual-grid', 'spec-table', 'product-card'] },
  { route: '/factory', en: 'Inside our workshop', zh: '车间', expect: ['bilingual-grid', 'gallery-grid', 'process-grid'] },
  { route: '/about', en: 'Shandong factory', zh: '山东工厂', expect: ['timeline', 'bilingual-grid'] },
  { route: '/contact', en: 'Talk to the factory directly', zh: '直接与工厂对话', expect: ['contact-card', 'map-slot'] },
  { route: '/does-not-exist', en: 'Page not found', zh: '页面未找到', expect: ['not-found'] }
];

(async function () {
  let pass = 0, fail = 0;
  const modes = MODE === 'all' ? ['http', 'offline'] : [MODE];
  for (const mode of modes) {
    OFFLINE = mode === 'offline';
    console.log(`\n--- ${OFFLINE ? 'OFFLINE (double-click file://)' : 'HTTP (server / Netlify)'} ---`);
    for (const c of CASES) {
      for (const lg of ['en', 'zh']) {
        let r;
        try { r = await boot(c.route, lg); }
        catch (e) { console.log(`FAIL ${c.route} [${lg}] boot threw: ${e.message}`); fail++; continue; }
        const problems = [];
        if (r.html.length < (c.route === '/does-not-exist' ? 220 : 400)) problems.push('empty render');
        if (/Content could not be loaded|内容加载失败/.test(r.html)) problems.push('render error block');
        if (!r.html.includes(c[lg])) problems.push(`missing ${lg} copy "${c[lg]}"`);
        if (!r.footer.includes('DY | 山东德宇发制品厂')) problems.push('footer copyright missing');
        if (!r.header.includes('data-lang="en"')) problems.push('language switch missing');
        (c.expect || []).forEach(k => { if (!r.html.includes(k)) problems.push('missing block ' + k); });
        if (c.route.startsWith('/products/') && c.route !== '/products' && !c.route.includes('does-not')) {
          if (count(r.html, 'class="product-card reveal"') !== 12) problems.push('pagination is not exactly 12 cards');
          if (count(r.html, 'page-btn') < 5) problems.push('pagination controls missing');
        }
        if (c.route.startsWith('/product/') && !c.route.startsWith('/products/')) {
          if (count(r.html, 'data-gallery-index=') !== 4) problems.push('gallery thumbnails != 4');
        }
        if (!r.title || r.title.length < 8) problems.push('document.title missing');
        if (OFFLINE) {
          if (/src="\/images\/|url\('\/images\//.test(r.html + r.header + r.footer)) problems.push('absolute /images path leaked into offline mode');
          if (!/src="images\//.test(r.html + r.header + r.footer)) problems.push('relative images/ path missing');
          if (r.links.some(h => h.charAt(0) !== '#')) problems.push('offline link is not a hash route');
          if (!r.hashHandler) problems.push('hashchange listener missing');
          if (r.popHandler) problems.push('popstate listener should be off in offline mode');
        } else {
          if (r.links.some(h => h.charAt(0) !== '/')) problems.push('HTTP link is not a clean path');
          if (!r.popHandler) problems.push('popstate listener missing');
        }
        if (problems.length) { console.log(`FAIL ${c.route} [${lg}] -> ${problems.join('; ')}`); fail++; }
        else { console.log(`PASS ${c.route} [${lg}] ${r.html.length} bytes, ${r.links.length} links`); pass++; }
      }
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
