/* ==========================================================================
   DY DEYU | Front-end application
   - No build step. Content lives in /content/*.json and is edited via Decap CMS.
   - Clean URLs, delivered through the SPA fallback (_redirects / 404.html).
   - One-click EN / CN switch; every label and every copy block is bilingual.
   - Display only: no cart, no checkout, no forms.
   ========================================================================== */
(function () {
  'use strict';

  /* Offline mode: double-clicking index.html (file://) blocks fetch(), but plain
     <script src>, <link href> and <img src> still load local files. In that mode
     index.html loads content/offline-data.js, clean URLs become hash routes and
     /images/... becomes relative images/... HTTP visits are unaffected. */
  var OFFLINE = window.location.protocol === 'file:';
  function IMG(name) { return (OFFLINE ? 'images/' : '/images/') + name; }
  function offlineAssets(o) {
    if (typeof o === 'string') return o.replace(/^\/images\//, 'images/');
    if (Array.isArray(o)) {
      for (var i = 0; i < o.length; i++) o[i] = offlineAssets(o[i]);
      return o;
    }
    if (o && typeof o === 'object') {
      Object.keys(o).forEach(function (k) { o[k] = offlineAssets(o[k]); });
    }
    return o;
  }
  function storeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function storeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var PAGE_SIZE = 12;
  var DATA = { site: null, ui: null, pages: null, categories: null, products: null };
  var uiMap = {};
  var categories = [];
  var lang = storeGet('dy-lang') === 'zh' ? 'zh' : 'en';
  var state = { images: [], galleryIndex: 0 };
  var renderSeq = 0;
  var revealObserver = null;

  /* ------------------------------------------------------------ utilities */
  function $(s, r) { return (r || document).querySelector(s); }
  function E(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function safeUrl(u, fallback) {
    if (!u || typeof u !== 'string') return fallback || '';
    var s = u.trim();
    if (/javascript:|data:/i.test(s)) return fallback || '';
    if (/^(https?:\/\/|\/|images\/|content\/|mailto:|tel:|#|\.\/|\.\.\/)/i.test(s)) return E(s);
    return fallback || '';
  }
  function T(key) {
    var row = uiMap[key];
    return E(row ? (row[lang] || row.en || key) : key);
  }
  function TR(key) {                       /* raw (unescaped) UI string */
    var row = uiMap[key];
    return row ? (row[lang] || row.en || key) : key;
  }
  function Tpl(key, vars) {
    var s = T(key);
    Object.keys(vars || {}).forEach(function (k) {
      s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), E(vars[k]));
    });
    return s;
  }
  function B(o, key) {
    if (!o) return '';
    return E(o[key + '_' + lang] || o[key + '_en'] || o[key + '_zh'] || '');
  }
  function BRaw(o, key) {
    if (!o) return '';
    return o[key + '_' + lang] || o[key + '_en'] || o[key + '_zh'] || '';
  }
  function BAlt(o, key, l) { return o ? E(o[key + '_' + l] || '') : ''; }
  function otherLang() { return lang === 'en' ? 'zh' : 'en'; }
  function enc(seg) { return encodeURIComponent(String(seg == null ? '' : seg)); }
  function bgUrl(u) {
    var s = String(u || '').trim();
    if (!/^(https?:\/\/|\/|images\/)/i.test(s)) return IMG('placeholder-hero.svg');
    return s.replace(/["'()\\]/g, '');
  }
  /* Every <a data-link> also gets a real href: crawlable, right-clickable,
     and still working when JavaScript is blocked from intercepting clicks. */
  function hydrateLinks(root) {
    (root || document).querySelectorAll('a[data-link]').forEach(function (a) {
      if (a.getAttribute('href')) return;
      var href = a.getAttribute('data-link');
      a.setAttribute('href', OFFLINE ? '#' + href : href);
    });
  }
  function paras(text) {
    return String(text || '').split(/\n{2,}/).map(function (p) {
      return '<p>' + E(p).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function materialKey(key) {
    return ['burmese', 'yunnan', 'vietnamese'].indexOf(key) >= 0 ? key : 'burmese';
  }
  function materialLabel(key) { return T('material_' + materialKey(key)); }
  function materialOther(key) {
    var row = uiMap['material_' + materialKey(key)] || {};
    return E(lang === 'en' ? (row.zh || '') : (row.en || ''));
  }
  function materialBoth(key) {
    return materialLabel(key) + ' · ' + materialOther(key);
  }
  function waLink() {
    var n = String(DATA.site.whatsapp_number || '').replace(/[^\d]/g, '');
    return n ? 'https://wa.me/' + n : '#';
  }

  /* ---------------------------------------------------------------- icons */
  var ICONS = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
    chevronRight: '<path d="M9 18l6-6-6-6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 7l9 6 9-6"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1116 0z"/><circle cx="12" cy="10" r="2.6"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a12 12 0 006 6L16 13l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    map: '<path d="M9 3L3 5v16l6-2 6 2 6-2V3l-6 2-6-2z"/><path d="M9 3v16M15 5v16"/>',
    zoom: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M11 8v6M8 11h6"/>',
    facebook: '<path d="M15 3h-3a4 4 0 00-4 4v3H5v4h3v7h4v-7h3l1-4h-4V7a1 1 0 011-1h3z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 014 0v4"/>',
    whatsapp: '<path d="M20 12a8 8 0 01-11.6 7.1L4 20l1-4.4A8 8 0 1120 12z"/><path d="M9 9c0 3 2.6 5.4 5.6 5.4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/>'
  };
  function icon(name, size) {
    var s = size || 18;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" ' +
      'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + (ICONS[name] || ICONS.arrow) + '</svg>';
  }

  /* ------------------------------------------------------------ data layer */
  function loadJson(path) {
    return fetch(path, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' -> HTTP ' + r.status);
      return r.json();
    });
  }
  function initBaseData() {
    uiMap = {};
    (DATA.ui.items || []).forEach(function (i) { uiMap[i.key] = { en: i.en, zh: i.zh }; });
    categories = (DATA.categories.items || []).slice().sort(function (a, b) {
      return (Number(a.order) || 0) - (Number(b.order) || 0);
    });
    if (OFFLINE) offlineAssets(DATA);
  }
  function loadBase() {
    if (OFFLINE) {
      var d = window.__DY_OFFLINE_DATA__;
      if (!d) {
        return Promise.reject(new Error(
          'content/offline-data.js is missing. Run: python tools/gen_offline_data.py'));
      }
      DATA.site = d.site; DATA.ui = d.ui; DATA.pages = d.pages; DATA.categories = d.categories;
      DATA.products = (d.products && d.products.items) || [];
      initBaseData();
      return Promise.resolve();
    }
    return Promise.all([
      loadJson('/content/site.json'),
      loadJson('/content/ui.json'),
      loadJson('/content/pages.json'),
      loadJson('/content/categories.json')
    ]).then(function (res) {
      DATA.site = res[0]; DATA.ui = res[1]; DATA.pages = res[2]; DATA.categories = res[3];
      initBaseData();
    });
  }
  function loadProducts() {
    if (DATA.products) return Promise.resolve(DATA.products);
    return loadJson('/content/products.json').then(function (d) {
      DATA.products = d.items || [];
      return DATA.products;
    });
  }
  function cat(slug) {
    return categories.filter(function (c) { return c.slug === slug; })[0] || null;
  }

  /* --------------------------------------------------------------- router */
  function currentPath() {
    var p = OFFLINE
      ? decodeURIComponent((window.location.hash || '').replace(/^#/, '') || '/')
      : decodeURIComponent(window.location.pathname || '/');
    p = p.replace(/\/index\.html$/, '/');
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return p || '/';
  }
  function navigate(path) {
    if (path === currentPath()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    window.scrollTo(0, 0);
    if (OFFLINE) {
      var target = '#' + path;
      if (window.location.hash === target) render();
      else window.location.hash = target;  /* hashchange -> render() */
      return;
    }
    history.pushState({}, '', path);
    render();
  }
  function isActive(prefix) {
    var p = currentPath();
    if (prefix === '/') return p === '/';
    if (prefix === '/products') return p.indexOf('/product') === 0;
    return p === prefix || p.indexOf(prefix + '/') === 0;
  }

  /* ---------------------------------------------------------------- shell */
  function navLink(href, label, key) {
    return '<a data-link="' + E(href) + '"' + (isActive(href) ? ' class="nav-active"' : '') +
      '>' + T(key) + '</a>';
  }
  function dropdownHtml() {
    return '<div class="dropdown">' + categories.map(function (c) {
      return '<a data-link="/products/' + enc(c.slug) + '"><span>' + B(c, 'name') +
        '</span><span class="num">' + E(c.num) + '</span></a>';
    }).join('') + '<a class="dropdown-all" data-link="/products">' + T('nav_all_collections') +
      ' ' + icon('arrow', 13) + '</a></div>';
  }
  function langToggle(extraClass) {
    return '<div class="lang-toggle ' + (extraClass || '') + '" aria-label="' + T('lang_label') + '">' +
      '<button type="button" data-lang="en" class="' + (lang === 'en' ? 'active' : '') + '">EN</button>' +
      '<button type="button" data-lang="zh" class="' + (lang === 'zh' ? 'active' : '') + '">CN</button></div>';
  }
  function socialHtml() {
    return '<div class="social-row">' + (DATA.site.social || []).map(function (s) {
      return '<a href="' + safeUrl(s.url, '#') + '" target="_blank" rel="noopener" aria-label="' +
        E(s.platform) + '">' + icon(s.platform in ICONS ? s.platform : 'globe', 16) + '</a>';
    }).join('') + '</div>';
  }
  function renderShell() {
    var s = DATA.site;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

    var nav = '<nav class="main-nav">' +
      '<div class="nav-item' + (isActive('/') ? ' active' : '') + '"><a data-link="/">' + T('nav_home') + '</a></div>' +
      '<div class="nav-item has-dropdown' + (isActive('/products') ? ' active' : '') + '">' +
        '<a data-link="/products">' + T('nav_products') + icon('chevronDown', 12) + '</a>' + dropdownHtml() + '</div>' +
      '<div class="nav-item' + (isActive('/factory') ? ' active' : '') + '"><a data-link="/factory">' + T('nav_factory') + '</a></div>' +
      '<div class="nav-item' + (isActive('/about') ? ' active' : '') + '"><a data-link="/about">' + T('nav_about') + '</a></div>' +
      '<div class="nav-item' + (isActive('/contact') ? ' active' : '') + '"><a data-link="/contact">' + T('nav_contact') + '</a></div>' +
      '</nav>';

    $('#site-header').innerHTML =
      '<div class="topbar"><div class="container topbar-inner">' +
        '<span>' + B(s, 'tagline') + '</span>' +
        '<span class="topbar-right"><a href="mailto:' + E(s.email) + '">' + E(s.email) + '</a>' +
        '<span class="dot hide-sm"></span><span class="hide-sm">' + T('display_only') + '</span></span>' +
      '</div></div>' +
      '<header class="site-header"><div class="container header-inner">' +
        '<a class="brand" data-link="/" aria-label="DY Deyu home">' +
          '<img src="' + safeUrl(s.logo, IMG('logo-dy.svg')) + '" alt="DY Deyu">' +
          '<span class="brand-text"><strong>' + B(s, 'brand') + '</strong><small>' + B(s, 'tagline') + '</small></span>' +
        '</a>' + nav +
        '<div class="header-actions">' + langToggle() +
          '<a class="btn btn-sm btn-gold" data-link="/contact">' + T('nav_contact') + '</a>' +
          '<button class="menu-toggle" type="button" data-menu-open aria-label="' + T('menu') + '">' + icon('menu', 20) + '</button>' +
        '</div>' +
      '</div></header>' +
      '<div class="drawer-overlay" data-menu-close></div>' +
      '<aside class="drawer" aria-label="' + T('menu') + '">' +
        '<div class="drawer-head"><strong>DY DEYU</strong>' +
          '<button class="drawer-close" type="button" data-menu-close aria-label="' + T('close') + '">' + icon('close', 16) + '</button></div>' +
        '<a class="drawer-link" data-link="/">' + T('nav_home') + '</a>' +
        '<a class="drawer-link" data-link="/products">' + T('nav_products') + '</a>' +
        '<a class="drawer-link" data-link="/factory">' + T('nav_factory') + '</a>' +
        '<a class="drawer-link" data-link="/about">' + T('nav_about') + '</a>' +
        '<a class="drawer-link" data-link="/contact">' + T('nav_contact') + '</a>' +
        '<span class="drawer-label">' + T('footer_collections') + '</span>' +
        '<div class="drawer-sub">' + categories.map(function (c) {
          return '<a data-link="/products/' + enc(c.slug) + '">' + B(c, 'name') + '</a>';
        }).join('') + '</div>' +
        '<span class="drawer-label">' + T('lang_label') + '</span>' + langToggle() +
        '<div class="drawer-contact">' +
          '<a href="mailto:' + E(s.email) + '">' + E(s.email) + '</a><br>' +
          '<a href="' + waLink() + '" target="_blank" rel="noopener">' + E(s.whatsapp_display) + '</a><br>' +
          B(s, 'address') +
        '</div>' +
      '</aside>';

    $('#site-footer').innerHTML =
      '<footer class="site-footer"><div class="container footer-grid">' +
        '<div class="footer-brand">' +
          '<div class="brand-mark"><img src="' + safeUrl(s.logo, IMG('logo-dy.svg')) + '" alt="DY"><strong>DY DEYU</strong></div>' +
          '<p>' + B(s, 'brand_full') + '<br>' + B(s, 'tagline') + '</p>' + socialHtml() +
        '</div>' +
        '<div class="footer-col"><h4>' + T('footer_quick') + '</h4><ul>' +
          '<li><a data-link="/">' + T('nav_home') + '</a></li>' +
          '<li><a data-link="/products">' + T('nav_products') + '</a></li>' +
          '<li><a data-link="/factory">' + T('nav_factory') + '</a></li>' +
          '<li><a data-link="/about">' + T('nav_about') + '</a></li>' +
          '<li><a data-link="/contact">' + T('nav_contact') + '</a></li></ul></div>' +
        '<div class="footer-col"><h4>' + T('footer_collections') + '</h4><ul>' +
          categories.map(function (c) {
            return '<li><a data-link="/products/' + enc(c.slug) + '">' + B(c, 'name') + ' · ' + BAlt(c, 'name', otherLang()) + '</a></li>';
          }).join('') + '</ul></div>' +
        '<div class="footer-col footer-contact"><h4>' + T('footer_contact') + '</h4>' +
          '<p><span class="lbl">' + T('contact_address') + '</span>' + B(s, 'address') + '</p>' +
          '<p><span class="lbl">' + T('contact_email') + '</span><a href="mailto:' + E(s.email) + '">' + E(s.email) + '</a></p>' +
          '<p><span class="lbl">' + T('contact_whatsapp') + '</span><a href="' + waLink() + '" target="_blank" rel="noopener">' + E(s.whatsapp_display) + '</a></p>' +
          '<p><span class="lbl">' + T('contact_hours') + '</span>' + B(s, 'hours') + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="footer-bottom"><div class="container footer-bottom-inner">' +
        '<span>&copy; ' + new Date().getFullYear() + ' DY | 山东德宇发制品厂 &nbsp;·&nbsp; ' + B(s, 'copyright') + '</span>' +
        '<span class="badge">' + T('footer_showcase') + '</span>' +
      '</div></div></footer>';
    hydrateLinks();
  }

  /* ----------------------------------------------------------- components */
  function crumbs(items) {
    return '<nav class="breadcrumb" aria-label="Breadcrumb"><div class="container breadcrumb-inner">' +
      items.map(function (it, i) {
        return (i ? '<span class="sep">/</span>' : '') + (it.href
          ? '<a data-link="' + safeUrl(it.href, '/') + '">' + E(it.label) + '</a>'
          : '<span class="current">' + E(it.label) + '</span>');
      }).join('') + '</div></nav>';
  }
  function sectionHead(o, center) {
    return '<div class="section-head' + (center ? ' center' : '') + ' reveal">' +
      (o.eyebrow_en || o.eyebrow_zh ? '<span class="eyebrow' + (center ? ' center' : '') + '">' + B(o, 'eyebrow') + '</span>' : '') +
      '<h2 class="section-title">' + B(o, 'title') + '</h2>' +
      (o.body_en || o.body_zh ? '<p class="section-lead">' + B(o, 'body') + '</p>' : '') + '</div>';
  }
  function statsStrip(items) {
    return '<div class="stats-strip"><div class="container"><div class="stats-grid">' +
      items.map(function (i) {
        return '<div class="stat"><div class="stat-value">' + E(i.value) + '</div>' +
          '<span class="stat-label">' + B(i, 'label') + '</span></div>';
      }).join('') + '</div></div></div>';
  }
  function ctaBand(o) {
    return '<section class="cta-band"><div class="container reveal">' +
      '<span class="eyebrow center">' + B(o, 'eyebrow') + '</span>' +
      '<h2>' + B(o, 'title') + '</h2><p>' + B(o, 'body') + '</p>' +
      '<div class="btn-row">' +
        '<a class="btn btn-gold" data-link="/contact">' + T('cta_contact') + icon('arrow', 15) + '</a>' +
        '<a class="btn btn-outline-light" data-link="/products">' + T('cta_explore') + '</a>' +
      '</div></div></section>';
  }
  function categoryCard(c, withDesc) {
    return '<a class="category-card reveal" data-link="/products/' + enc(c.slug) + '">' +
      '<div class="category-media">' +
        '<img src="' + safeUrl(c.image, IMG('placeholder-category-wigs.svg')) + '" alt="' + B(c, 'name') + '" loading="lazy">' +
        '<span class="idx">' + E(c.num) + '</span>' +
        '<span class="corner">' + icon('arrow', 15) + '</span>' +
      '</div><div class="category-body">' +
        '<h3>' + B(c, 'name') + '</h3>' +
        '<span class="zh">' + BAlt(c, 'name', otherLang()) + '</span>' +
        '<span class="sub">' + B(c, 'subtitle') + '</span>' +
        (withDesc ? '<p class="desc">' + B(c, 'description') + '</p>' : '') +
        '<span class="more">' + T('cta_view_collection') + icon('arrow', 14) + '</span>' +
      '</div></a>';
  }
  function categoryGrid(withDesc) {
    return '<div class="category-grid">' + categories.map(function (c) {
      return categoryCard(c, withDesc);
    }).join('') + '</div>';
  }
  function productCard(p) {
    var imgs = (p.images || []).length ? p.images : [IMG('placeholder-product-1.svg')];
    return '<a class="product-card reveal" data-link="/product/' + enc(p.id) + '">' +
      '<div class="product-media"><img src="' + safeUrl(imgs[0], IMG('placeholder-product-1.svg')) +
        '" alt="' + B(p, 'name') + '" loading="lazy">' +
        '<span class="view">' + T('cta_view_details') + '</span></div>' +
      '<div class="product-body">' +
        '<div class="product-name">' + B(p, 'name') + '</div>' +
        '<div class="product-name-zh">' + BAlt(p, 'name', otherLang()) + '</div>' +
        '<div class="product-foot"><span class="material-pill">' + materialLabel(p.material) +
          ' / ' + materialOther(p.material) +
          '</span><span class="arrow">' + icon('arrow', 15) + '</span></div>' +
      '</div></a>';
  }
  function pageList(current, total) {
    var out = [], i;
    if (total <= 7) { for (i = 1; i <= total; i++) out.push(i); return out; }
    out.push(1);
    var start = Math.max(2, current - 1), end = Math.min(total - 1, current + 1);
    if (current <= 3) { start = 2; end = 4; }
    if (current >= total - 2) { start = total - 3; end = total - 1; }
    if (start > 2) out.push('...');
    for (i = start; i <= end; i++) out.push(i);
    if (end < total - 1) out.push('...');
    out.push(total);
    return out;
  }
  function catHref(slug, page) {
    return '/products/' + enc(slug) + (page > 1 ? '/' + page : '');
  }
  function pagination(slug, current, total) {
    if (total <= 1) return '';
    var prev = current > 1 ? catHref(slug, current - 1) : '';
    var next = current < total ? catHref(slug, current + 1) : '';
    return '<nav class="pagination" aria-label="' + T('pagination_label') + '">' +
      '<a class="page-btn text' + (prev ? '' : ' disabled') + '"' + (prev ? ' data-link="' + E(prev) + '"' : '') + '>' +
        icon('chevronLeft', 14) + T('pagination_prev') + '</a>' +
      pageList(current, total).map(function (n) {
        return n === '...'
          ? '<span class="page-ellipsis">&hellip;</span>'
          : '<a class="page-btn' + (n === current ? ' active' : '') + '" data-link="' +
            E(catHref(slug, n)) + '"' + (n === current ? ' aria-current="page"' : '') + '>' + n + '</a>';
      }).join('') +
      '<a class="page-btn text' + (next ? '' : ' disabled') + '"' + (next ? ' data-link="' + E(next) + '"' : '') + '>' +
        T('pagination_next') + icon('chevronRight', 14) + '</a>' +
      '</nav>';
  }
  function figure(item) {
    return '<figure class="figure reveal"><div class="frame">' +
      '<img src="' + safeUrl(item.image, IMG('placeholder-factory-1.svg')) + '" alt="' + B(item, 'caption') + '" loading="lazy"></div>' +
      '<figcaption>' + B(item, 'caption') + '<span class="zh">' + BAlt(item, 'caption', otherLang()) + '</span></figcaption></figure>';
  }
  function processGrid(proc) {
    return '<div class="process-grid">' + (proc.items || []).map(function (it) {
      return '<div class="process-item reveal"><div class="num">' + E(it.num) + '</div>' +
        '<h3>' + B(it, 'title') + '</h3><p>' + B(it, 'text') + '</p></div>';
    }).join('') + '</div>';
  }
  function bilingualBlock(en, zh) {
    return '<div class="bilingual-grid">' +
      '<div class="bilingual-col reveal"><span class="lang-tag">' + T('label_en') + '</span><div class="text">' + paras(en) + '</div></div>' +
      '<div class="bilingual-col reveal"><span class="lang-tag">' + T('label_zh') + '</span><div class="text">' + paras(zh) + '</div></div>' +
      '</div>';
  }
  function pageHero(o) {
    return '<section class="page-hero"><div class="container">' +
      '<span class="eyebrow">' + B(o, 'eyebrow') + '</span>' +
      '<h1>' + B(o, 'title') + '</h1><p>' + B(o, 'body') + '</p></div></section>';
  }

  /* --------------------------------------------------------------- pages */
  function homePage() {
    var p = DATA.pages.home;
    var h = p.hero;
    return '<section class="hero">' +
        '<div class="hero-bg" style="background-image:url(\'' + E(bgUrl(h.image)) + '\')"></div>' +
        '<div class="container"><div class="hero-content">' +
          '<span class="eyebrow">' + B(h, 'eyebrow') + '</span>' +
          '<h1>' + B(h, 'title') + '</h1>' +
          '<p class="hero-body">' + B(h, 'body') + '</p>' +
          '<div class="btn-row">' +
            '<a class="btn btn-gold" data-link="/products">' + T('cta_explore') + icon('arrow', 15) + '</a>' +
            '<a class="btn btn-outline-light" data-link="/factory">' + T('cta_factory') + '</a>' +
          '</div></div></div>' +
        '<div class="hero-foot"><div class="container hero-foot-inner">' +
          '<span>SHANDONG · CHINA</span><span class="line"></span><span>100% HUMAN HAIR</span>' +
        '</div></div>' +
      '</section>' +
      statsStrip(p.stats.items) +
      '<section class="section"><div class="container split">' +
        '<div class="split-media reveal"><img src="' + safeUrl(p.intro.image, IMG('placeholder-factory-2.svg')) +
          '" alt="DY Deyu workshop" loading="lazy"></div>' +
        '<div class="reveal"><span class="eyebrow">' + B(p.intro, 'eyebrow') + '</span>' +
          '<h2 class="section-title">' + B(p.intro, 'title') + '</h2>' +
          '<p class="section-lead">' + B(p.intro, 'body') + '</p>' +
          '<div class="btn-row"><a class="text-link" data-link="/about">' + T('nav_about') + icon('arrow', 14) + '</a>' +
          '<a class="text-link" data-link="/factory">' + T('cta_factory') + icon('arrow', 14) + '</a></div>' +
        '</div></div></section>' +
      '<section class="section section-sand"><div class="container">' + sectionHead(p.categories, true) +
        categoryGrid(false) +
        '<div class="text-center" style="margin-top:48px"><a class="btn btn-outline" data-link="/products">' +
          T('cta_all_products') + icon('arrow', 15) + '</a></div>' +
      '</div></section>' +
      '<section class="section"><div class="container">' + sectionHead(p.advantages) +
        '<div class="advantage-grid">' + p.advantages.items.map(function (it) {
          return '<div class="advantage reveal"><div class="num">' + E(it.num) + '</div>' +
            '<h3>' + B(it, 'title') + '</h3><p>' + B(it, 'text') + '</p></div>';
        }).join('') + '</div></div></section>' +
      '<section class="section section-alt"><div class="container">' + sectionHead(p.process, true) +
        processGrid(p.process) + '</div></section>' +
      '<section class="section"><div class="container">' + sectionHead(p.materials, true) +
        '<div class="material-grid">' + p.materials.items.map(function (it) {
          return '<article class="material-card reveal"><img src="' +
            safeUrl(it.image, IMG('placeholder-material-1.svg')) + '" alt="' + B(it, 'name') + '" loading="lazy">' +
            '<div class="body"><h3>' + B(it, 'name') + '</h3><span class="zh">' + BAlt(it, 'name', otherLang()) + '</span>' +
            '<p>' + B(it, 'text') + '</p></div></article>';
        }).join('') + '</div></div></section>' +
      '<section class="section section-sand"><div class="container split">' +
        '<div class="reveal"><span class="eyebrow">' + B(p.factory_teaser, 'eyebrow') + '</span>' +
          '<h2 class="section-title">' + B(p.factory_teaser, 'title') + '</h2>' +
          '<p class="section-lead">' + B(p.factory_teaser, 'body') + '</p>' +
          '<div class="btn-row"><a class="btn btn-outline" data-link="/factory">' + T('cta_factory') + icon('arrow', 15) + '</a></div>' +
        '</div>' +
        '<div class="split-media reveal"><img src="' + safeUrl(p.factory_teaser.image, IMG('placeholder-factory-1.svg')) +
          '" alt="DY Deyu factory" loading="lazy"></div>' +
      '</div></section>' +
      ctaBand(p.cta_band);
  }

  function productsHub() {
    var o = DATA.pages.products_hub;
    return pageHero(o) +
      crumbs([{ label: TR('breadcrumb_home'), href: '/' }, { label: TR('breadcrumb_products') }]) +
      '<section class="section"><div class="container">' +
        '<div class="intro-block reveal"><p>' + B(o, 'body') + '</p></div>' +
        categoryGrid(true) + '</div></section>' +
      ctaBand(DATA.pages.home.cta_band);
  }

  function categoryListPage(slug, pageNum) {
    var c = cat(slug);
    if (!c) return notFound();
    return loadProducts().then(function (all) {
      var list = all.filter(function (p) { return p.category === slug; });
      var total = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
      var page = clamp(pageNum || 1, 1, total);
      var slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      var title = BRaw(c, 'name');
      return {
        html: pageHero({
          eyebrow_en: 'PRODUCT CENTER', eyebrow_zh: '产品中心',
          title_en: c.name_en, title_zh: c.name_zh,
          body_en: c.subtitle_en, body_zh: c.subtitle_zh
        }) +
        crumbs([
          { label: TR('breadcrumb_home'), href: '/' },
          { label: TR('breadcrumb_products'), href: '/products' },
          { label: BRaw(c, 'name') }
        ]) +
        '<section class="section"><div class="container">' +
          '<div class="intro-block reveal"><span class="eyebrow">' + T('collection_label') + ' ' + E(c.num) + '</span>' +
            '<p>' + B(c, 'intro') + '</p></div>' +
          '<div class="collection-toolbar"><div><h2>' + B(c, 'name') +
            '<span class="zh">' + BAlt(c, 'name', otherLang()) + '</span></h2></div>' +
            '<span class="count">' + Tpl('showing', {
              a: (page - 1) * PAGE_SIZE + (slice.length ? 1 : 0),
              b: (page - 1) * PAGE_SIZE + slice.length,
              n: list.length
            }) + '</span></div>' +
          (slice.length ? '<div class="product-grid">' + slice.map(productCard).join('') + '</div>'
            : '<p class="section-lead">' + T('no_products') + '</p>') +
          pagination(slug, page, total) +
        '</div></section>' +
        ctaBand(DATA.pages.home.cta_band),
        seo: { title: title, desc: String(c.intro_en || c.description_en || '').slice(0, 160) }
      };
    });
  }

  function videoBlock(p) {
    /* CMS offers both an uploaded MP4 and a pasted URL; the URL wins. */
    var v = safeUrl(p.video_url || p.video, '');
    var poster = safeUrl(p.video_poster, '');
    var inner;
    if (v) {
      if (/youtu\.?be|vimeo/i.test(v)) {
        var clean = v.replace(/&amp;/g, '&');
        var id = clean.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
        var src = id ? 'https://www.youtube.com/embed/' + id[1] : clean;
        inner = '<iframe src="' + E(src) + '" title="Product video" loading="lazy" allowfullscreen></iframe>';
      } else {
        inner = '<video controls preload="none"' + (poster ? ' poster="' + poster + '"' : '') +
          '><source src="' + v + '" type="video/mp4"></video>';
      }
    } else {
      inner = '<div class="video-empty"><span class="play">' + icon('play', 22) + '</span>' +
        '<strong>' + T('detail_video') + '</strong><p>' + T('detail_video_empty') + '</p></div>';
    }
    return '<div class="video-slot">' + inner + '</div>';
  }

  function specTable(p) {
    var rows = [
      [T('spec_material'), materialBoth(p.material)],
      [T('spec_texture'), B(p, 'texture')],
      [T('spec_length'), E(p.length)],
      [T('spec_colour'), B(p, 'colour')],
      [T('spec_construction'), B(p, 'construction')],
      [T('spec_weight'), B(p, 'weight')],
      [T('spec_grade'), B(p, 'grade')]
    ];
    return '<dl class="spec-table">' + rows.filter(function (r) { return r[1]; }).map(function (r) {
      return '<div class="spec-row"><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
    }).join('') + '</dl>';
  }

  function productDetailPage(id) {
    return loadProducts().then(function (all) {
      var p = all.filter(function (x) { return String(x.id).toLowerCase() === String(id).toLowerCase(); })[0];
      if (!p) return { html: notFound(), seo: { title: TR('not_found_title'), desc: '' } };
      var c = cat(p.category);
      var imgs = (p.images && p.images.length ? p.images : [IMG('placeholder-product-1.svg')]).map(function (u) {
        return safeUrl(u, IMG('placeholder-product-1.svg'));
      });
      state.images = imgs; state.galleryIndex = 0;

      var related = all.filter(function (x) { return x.category === p.category && x.id !== p.id; }).slice(0, 4);
      if (related.length < 4) {
        all.filter(function (x) { return x.category !== p.category; }).slice(0, 4 - related.length)
          .forEach(function (x) { related.push(x); });
      }

      var thumbnails = imgs.map(function (u, i) {
        return '<button type="button" class="thumb' + (i === 0 ? ' active' : '') +
          '" data-gallery-index="' + i + '" aria-label="Image ' + (i + 1) + '"><img src="' + u + '" alt="" loading="lazy"></button>';
      }).join('');

      var html = crumbs([
        { label: TR('breadcrumb_home'), href: '/' },
        { label: TR('breadcrumb_products'), href: '/products' },
        { label: BRaw(c, 'name'), href: catHref(p.category, 1) },
        { label: BRaw(p, 'name') }
      ]) +
      '<section class="section-tight"><div class="container"><div class="detail-layout">' +
        '<div class="gallery-wrap reveal">' +
          '<div class="gallery-main" data-lightbox title="' + T('view_larger') + '">' +
            '<img id="gallery-main-img" src="' + imgs[0] + '" alt="' + B(p, 'name') + '"></div>' +
          '<div class="gallery-caption"><span>' + T('detail_gallery') + '</span><span>' + T('detail_gallery_hint') + '</span></div>' +
          '<div class="gallery-thumbs">' + thumbnails + '</div>' +
        '</div>' +
        '<div class="detail-info reveal">' +
          '<span class="detail-code">' + T('detail_code') + ' &nbsp; ' + E(p.id) + '</span>' +
          '<h1>' + B(p, 'name') + '</h1>' +
          '<div class="detail-zh">' + BAlt(p, 'name', otherLang()) + '</div>' +
          '<p class="detail-summary">' + B(p, 'summary') + '</p>' +
          '<div class="detail-meta"><span class="material-pill">' + materialBoth(p.material) + '</span>' +
            '<span class="material-pill">' + E(p.length) + '</span></div>' +
          '<h2 class="detail-section-title" style="font-size:22px;margin-top:36px">' + T('detail_specs') + '</h2>' +
          specTable(p) +
          '<div class="detail-note">' + T('footer_showcase') + '</div>' +
        '</div>' +
      '</div></div></section>' +
      '<section class="section section-alt"><div class="container">' +
        '<div class="section-head reveal"><span class="eyebrow">' + T('detail_video') + '</span>' +
          '<h2 class="section-title-sm">' + T('detail_video') + '</h2></div>' +
        '<div class="reveal">' + videoBlock(p) + '</div>' +
      '</div></section>' +
      '<section class="section"><div class="container">' +
        '<div class="section-head reveal"><span class="eyebrow">' + T('bilingual_title') + '</span>' +
          '<h2 class="section-title-sm">' + T('detail_description') + '</h2>' +
          '<p class="section-lead">' + T('detail_bilingual') + '</p></div>' +
        bilingualBlock(p.description_en, p.description_zh) +
      '</div></section>' +
      '<section class="section section-sand"><div class="container">' +
        '<div class="section-head reveal"><h2 class="section-title-sm">' + T('detail_related') + '</h2></div>' +
        '<div class="product-grid">' + related.map(productCard).join('') + '</div>' +
        '<div class="btn-row"><a class="btn btn-outline" data-link="' + E(catHref(p.category, 1)) + '">' +
          T('cta_back_collection') + icon('arrow', 15) + '</a></div>' +
      '</div></section>' +
      ctaBand(DATA.pages.home.cta_band);

      return {
        html: html,
        seo: { title: BRaw(p, 'name'), desc: String(p.summary_en || '').slice(0, 160) }
      };
    });
  }

  function factoryPage() {
    var f = DATA.pages.factory;
    return pageHero(f.hero) +
      crumbs([{ label: TR('breadcrumb_home'), href: '/' }, { label: TR('nav_factory') }]) +
      '<section class="section"><div class="container">' +
        '<div class="section-head reveal"><span class="eyebrow">' + T('bilingual_title') + '</span>' +
          '<h2 class="section-title-sm">' + B(DATA.site, 'brand_full') + '</h2></div>' +
        bilingualBlock(f.profile_en, f.profile_zh) +
      '</div></section>' +
      statsStrip(f.stats.items) +
      '<section class="section"><div class="container">' + sectionHead(f.environment) +
        '<div class="gallery-grid">' + f.environment.images.map(figure).join('') + '</div></div></section>' +
      '<section class="section section-sand"><div class="container">' + sectionHead(f.workshop) +
        '<div class="gallery-grid three">' + f.workshop.images.map(figure).join('') + '</div></div></section>' +
      '<section class="section section-alt"><div class="container">' + sectionHead(DATA.pages.home.process, true) +
        processGrid(DATA.pages.home.process) + '</div></section>' +
      '<section class="section"><div class="container">' + sectionHead(f.quality) +
        '<div class="quality-grid">' + f.quality.items.map(function (it) {
          return '<div class="advantage reveal"><div class="num">' + E(it.num) + '</div>' +
            '<h3>' + B(it, 'title') + '</h3><p>' + B(it, 'text') + '</p></div>';
        }).join('') + '</div></div></section>' +
      ctaBand(f.cta_band);
  }

  function aboutPage() {
    var a = DATA.pages.about;
    return pageHero(a.hero) +
      crumbs([{ label: TR('breadcrumb_home'), href: '/' }, { label: TR('nav_about') }]) +
      '<section class="section"><div class="container split">' +
        '<div class="reveal"><span class="eyebrow">' + T('bilingual_title') + '</span>' +
          '<h2 class="section-title">' + B(DATA.site, 'brand') + '</h2>' +
          '<div class="bilingual-grid compact" style="margin-top:32px">' +
            '<div class="bilingual-col"><span class="lang-tag">' + T('label_en') + '</span><div class="text">' + paras(a.story_en) + '</div></div>' +
            '<div class="bilingual-col"><span class="lang-tag">' + T('label_zh') + '</span><div class="text">' + paras(a.story_zh) + '</div></div>' +
          '</div></div>' +
        '<div class="split-media reveal"><img src="' + safeUrl(a.image, IMG('placeholder-factory-3.svg')) +
          '" alt="DY Deyu" loading="lazy"></div>' +
      '</div></section>' +
      '<section class="section section-sand"><div class="container split">' +
        '<div class="reveal">' + sectionHead(a.milestones) +
          '<div class="timeline">' + a.milestones.items.map(function (it) {
            return '<div class="timeline-item"><div class="year">' + E(it.year) + '</div><p>' + B(it, 'text') + '</p></div>';
          }).join('') + '</div></div>' +
        '<div class="reveal"><span class="eyebrow">' + B(a.advantages, 'eyebrow') + '</span>' +
          '<h2 class="section-title-sm">' + B(a.advantages, 'title') + '</h2>' +
          '<div class="advantage-grid" style="grid-template-columns:repeat(2,1fr);margin-top:32px">' +
            a.advantages.items.map(function (it) {
              return '<div class="advantage"><div class="num">' + E(it.num) + '</div>' +
                '<h3>' + B(it, 'title') + '</h3><p>' + B(it, 'text') + '</p></div>';
            }).join('') + '</div></div>' +
      '</div></section>' +
      '<section class="section"><div class="container">' + sectionHead(a.values) +
        '<div class="quality-grid">' + a.values.items.map(function (it) {
          return '<div class="advantage reveal"><div class="num">' + E(it.num) + '</div>' +
            '<h3>' + B(it, 'title') + '</h3><p>' + B(it, 'text') + '</p></div>';
        }).join('') + '</div></div></section>' +
      ctaBand(a.cta_band);
  }

  function contactPage() {
    var c = DATA.pages.contact, s = DATA.site;
    var mapEmbed = safeUrl(s.map_embed_url, '');
    var mapImage = safeUrl(s.map_image, '');
    var mapInner = mapEmbed
      ? '<iframe src="' + mapEmbed + '" title="Factory location" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
      : (mapImage ? '<img src="' + mapImage + '" alt="Factory location" loading="lazy">'
        : '<div class="map-empty">' + icon('pin', 34) + '<strong>' + T('contact_find') + '</strong><p>' +
          T('contact_map_empty') + '</p></div>');

    return pageHero(c.hero) +
      crumbs([{ label: TR('breadcrumb_home'), href: '/' }, { label: TR('nav_contact') }]) +
      '<section class="section"><div class="container">' +
        '<div class="contact-grid">' +
          '<article class="contact-card reveal"><span class="icon">' + icon('pin', 20) + '</span>' +
            '<span class="label">' + T('contact_address') + '</span><h3>' + B(s, 'brand_full') + '</h3>' +
            '<div class="value">' + B(s, 'address') + '<span class="sub">' + BAlt(s, 'address', otherLang()) + '</span></div></article>' +
          '<article class="contact-card reveal"><span class="icon">' + icon('mail', 20) + '</span>' +
            '<span class="label">' + T('contact_email') + '</span><h3>' + E(s.email) + '</h3>' +
            '<div class="value"><a href="mailto:' + E(s.email) + '">' + E(s.email) + '</a>' +
            '<span class="sub">' + T('contact_reply') + '</span></div></article>' +
          '<article class="contact-card reveal"><span class="icon">' + icon('phone', 20) + '</span>' +
            '<span class="label">' + T('contact_whatsapp') + '</span><h3>' + E(s.whatsapp_display) + '</h3>' +
            '<div class="value"><a href="' + waLink() + '" target="_blank" rel="noopener">' + E(s.whatsapp_display) + '</a>' +
            '<span class="sub">' + T('contact_phone') + ': ' + E(s.telephone) + '</span></div></article>' +
        '</div>' +
        '<div class="detail-note" style="margin-top:28px">' + icon('clock', 15) + ' &nbsp; ' +
          T('contact_hours') + ': ' + B(s, 'hours') + '</div>' +
      '</div></section>' +
      '<section class="section section-alt"><div class="container">' +
        '<div class="section-head reveal"><span class="eyebrow">' + T('contact_find') + '</span>' +
          '<h2 class="section-title-sm">' + T('contact_find') + '</h2>' +
          '<p class="section-lead">' + B(c, 'map_note') + '</p></div>' +
        '<div class="reveal"><div class="map-slot">' + mapInner + '</div></div>' +
      '</div></section>' +
      '<section class="section"><div class="container">' + sectionHead(c.prepare) +
        '<div class="info-list">' + c.prepare.items.map(function (it) {
          return '<div class="info-item reveal"><div class="num">' + E(it.num) + '</div>' +
            '<h3>' + B(it, 'title') + '</h3><p>' + B(it, 'text') + '</p></div>';
        }).join('') + '</div></div></section>' +
      ctaBand(c.cta_band);
  }

  function notFound() {
    return '<section class="not-found"><div class="container">' +
      '<div class="serif gold">404</div><h2>' + T('not_found_title') + '</h2>' +
      '<p>' + T('not_found_text') + '</p>' +
      '<a class="btn btn-gold" data-link="/">' + T('back_home') + icon('arrow', 15) + '</a>' +
      '</div></section>';
  }

  /* ------------------------------------------------------------ rendering */
  function setSEO(seo) {
    var brand = BRaw(DATA.site, 'brand') || 'DY DEYU';
    document.title = (seo && seo.title ? seo.title : BRaw(DATA.site, 'seo_title')) + ' | ' + brand;
    var m = $('meta[name="description"]');
    if (m) m.setAttribute('content', (seo && seo.desc) ? seo.desc : BRaw(DATA.site, 'seo_description'));
  }
  function observeReveals() {
    if (revealObserver) revealObserver.disconnect();
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in-view'); });
      return;
    }
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in-view'); revealObserver.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .06 });
    document.querySelectorAll('#app .reveal').forEach(function (el) { revealObserver.observe(el); });
  }
  function render(opts) {
    var seq = ++renderSeq;
    var keepScroll = opts && opts.keepScroll;
    var y = window.scrollY;
    var app = $('#app');
    if (!keepScroll) app.innerHTML = '<div class="loading-wrap">' + T('loading') + '</div>';

    return Promise.resolve().then(function () {
      var p = currentPath(), out, seo = null;
      if (p === '/') { out = homePage(); }
      else if (p === '/products') { out = productsHub(); }
      else if (p === '/factory') { out = factoryPage(); }
      else if (p === '/about') { out = aboutPage(); }
      else if (p === '/contact') { out = contactPage(); }
      else if (p.indexOf('/product/') === 0) {
        out = productDetailPage(p.slice('/product/'.length).replace(/\//g, ''));
      } else if (p.indexOf('/products/') === 0) {
        var bits = p.slice('/products/'.length).split('/').filter(Boolean);
        out = categoryListPage(bits[0], parseInt(bits[1], 10) || 1);
      } else { out = notFound(); }

      return Promise.resolve(out).then(function (result) {
        if (seq !== renderSeq) return;
        var html = typeof result === 'string' ? result : result.html;
        seo = typeof result === 'object' && result.seo ? result.seo : null;
        app.innerHTML = html;
        hydrateLinks(app);
        setSEO(seo);
        renderShell();
        observeReveals();
        if (keepScroll) window.scrollTo(0, y);
      });
    }).catch(function (err) {
      if (seq !== renderSeq) return;
      console.error('[DY Deyu] render error', err);
      app.innerHTML = '<section class="not-found"><div class="container">' +
        '<h2>内容加载失败 / Content could not be loaded</h2>' +
        '<p>' + (OFFLINE
          ? '离线数据快照缺失。请在项目目录运行 <b>python tools/gen_offline_data.py</b> 后刷新，或双击「启动本地预览.bat」用实时数据浏览。'
          : '请确认 /content/*.json 可访问，或按 README.md 部署到 Netlify 后访问。') + '</p>' +
        '<p style="font-size:12px;color:#857768">' + E(err && err.message ? err.message : err) + '</p></div></section>';
    });
  }

  function setLang(l) {
    if (l === lang) return;
    lang = l;
    storeSet('dy-lang', l);
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
    renderShell();
    render({ keepScroll: true });
  }
  function openLightbox(src) {
    var box = $('#lightbox');
    $('#lightbox-img').setAttribute('src', src);
    box.classList.add('open');
  }
  function closeLightbox() { $('#lightbox').classList.remove('open'); }

  /* --------------------------------------------------------------- events */
  document.addEventListener('click', function (ev) {
    var t = ev.target;

    var langBtn = t.closest('[data-lang]');
    if (langBtn) { setLang(langBtn.getAttribute('data-lang')); return; }

    if (t.closest('[data-menu-open]')) { document.body.classList.add('drawer-open'); return; }
    if (t.closest('[data-menu-close]')) { document.body.classList.remove('drawer-open'); return; }

    var thumb = t.closest('[data-gallery-index]');
    if (thumb) {
      var i = parseInt(thumb.getAttribute('data-gallery-index'), 10);
      state.galleryIndex = i;
      var main = $('#gallery-main-img');
      if (main && state.images[i]) main.setAttribute('src', state.images[i]);
      document.querySelectorAll('.gallery-thumbs .thumb').forEach(function (el) { el.classList.remove('active'); });
      thumb.classList.add('active');
      return;
    }
    if (t.closest('[data-lightbox-close]') || (t.id === 'lightbox' && t.classList.contains('open'))) { closeLightbox(); return; }
    var zoom = t.closest('[data-lightbox]');
    if (zoom) {
      var img = zoom.querySelector('img');
      if (img) openLightbox(img.getAttribute('src'));
      return;
    }

    var link = t.closest('a[data-link]');
    if (link) {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
      ev.preventDefault();
      document.body.classList.remove('drawer-open');
      navigate(link.getAttribute('data-link'));
    }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { closeLightbox(); document.body.classList.remove('drawer-open'); }
  });
  window.addEventListener(OFFLINE ? 'hashchange' : 'popstate', function () { render(); });

  /* ----------------------------------------------------------------- boot */
  loadBase().then(function () {
    renderShell();
    return render();
  }).catch(function (err) {
    console.error('[DY Deyu] init error', err);
    $('#app').innerHTML = '<section class="not-found"><div class="container">' +
      '<h2>内容加载失败 / Content could not be loaded</h2>' +
      '<p>' + (OFFLINE
        ? '找不到 content/offline-data.js。请运行 <b>python tools/gen_offline_data.py</b> 后刷新，或双击「启动本地预览.bat」。'
        : '请通过本地服务器或 Netlify 访问，确保 /content/*.json 可读取。详见 README.md。') + '</p>' +
      '<p style="font-size:12px;color:#857768">' + E(err && err.message ? err.message : err) + '</p></div></section>';
  });
})();
