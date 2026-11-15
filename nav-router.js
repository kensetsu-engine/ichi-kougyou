/* preview nav router — maps production slugs to local .dc.html files so the prototype is navigable.
   Production hrefs stay untouched in markup; this only intercepts clicks in preview. */
(function () {
  if (window.__ichiNavRouter) return;
  window.__ichiNavRouter = true;

  var MAP = {
    '/': 'トップページ(ページ遷移可能).dc.html',
    '/work': '業務案内.dc.html',
    '/construction': 'プール工事.dc.html',
    '/blog-ex/instance': '施工実績.dc.html',
    '/recruit': '採用情報.dc.html',
    '/information': '会社概要.dc.html',
    '/blog': 'ブログ.dc.html',
    '/form/inquiry': 'お問い合わせ.dc.html',
    '/corporate': '法人・元請けの方へ.dc.html',
    '/civil': '土木・駐車場工事.dc.html',
    '/exterior': '外構・エクステリア工事.dc.html',
    '/price': '料金の目安.dc.html',
    '/faq': 'よくある質問.dc.html',
    '/about': '一工業について.dc.html',
    '/sitemap': 'サイトマップ.dc.html'
  };

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) !== '/') return;
    var clean = href.split('#')[0].split('?')[0];
    if (clean.length > 1) clean = clean.replace(/\/+$/, '');
    if (clean === '') clean = '/';
    var file = MAP[clean];
    if (!file) return;
    e.preventDefault();
    var hash = href.indexOf('#') >= 0 ? href.slice(href.indexOf('#')) : '';
    window.location.href = encodeURI(file) + hash;
  }, true);
})();
