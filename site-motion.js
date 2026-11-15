/* 一工業 共通モーション：慣性スムーススクロール／写真パララックス／マーキー／下層ヘッダーのズーム／写真のカーテン表示／ホバーズーム／動きの一時停止ボタン */
(function () {
  if (window.__ichiMotion) return;
  window.__ichiMotion = true;
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* パララックスの強さ（写真の拡大率と、枠の高さに対するずれ幅） */
  var PLX_SCALE = 1.3, PLX_SHIFT = 0.13;

  var css = ''
    + '@keyframes mqX{from{transform:translateX(0)}to{transform:translateX(-50%)}}'
    + '@keyframes mqXr{from{transform:translateX(-50%)}to{transform:translateX(0)}}'
    + '@keyframes phZoom{from{transform:scale(1.14)}to{transform:scale(1)}}'
    + '[data-mq]:hover [data-mq-track]{animation-play-state:paused !important}'
    + 'html.mq-paused [data-mq-track],html.mq-paused [data-ph-zoom]{animation-play-state:paused !important}'
    + '#top section a img:not([data-plx]){transition:transform .8s cubic-bezier(.2,.6,.2,1)}'
    + '#top section a:hover img:not([data-plx]){transform:scale(1.06)}'
    + 'html.ichi-smooth{scroll-behavior:auto !important}'
    + '[data-plx]{scale:' + PLX_SCALE + ';will-change:translate;backface-visibility:hidden;transition:scale .9s cubic-bezier(.2,.6,.2,1)}'
    + 'a:hover [data-plx]{scale:' + (PLX_SCALE + 0.06) + '}'
    + '[data-mq-item] img{transition:transform .6s cubic-bezier(.2,.6,.2,1)}'
    + '[data-mq-item]:hover img{transform:scale(1.08)}'
    + '.ichi-mq-btn{position:fixed;right:12px;bottom:12px;z-index:46;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;padding:0;border-radius:999px;border:2px solid #14342A;background:#fff;color:#14342A;font-family:"Zen Kaku Gothic New",sans-serif;font-weight:700;font-size:.82rem;cursor:pointer;box-shadow:0 6px 18px rgba(20,52,42,.14)}'
    + '.ichi-mq-btn:hover{background:#EEF6F0}'
    + '@media (max-width:1319px){.ichi-mq-btn{bottom:72px}}'
    + '@media (prefers-reduced-motion: reduce){[data-mq-track],[data-ph-zoom]{animation:none !important}.ichi-mq-btn{display:none}#top section a:hover img,[data-mq-item]:hover img{transform:none}}';
  var st = document.createElement('style');
  st.id = 'ichi-motion-css';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  if (RM) return;

  /* ───────── 慣性スムーススクロール（マウスホイールのみ。タッチ端末はネイティブ） ───────── */
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var cur = window.scrollY, tgt = cur, running = false, lastT = 0;
  var EASE = 7; /* 大きいほどキビキビ、小さいほどゆっくり */
  var maxYCache = 0;
  function maxY() { return maxYCache || (maxYCache = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)); }
  function canScrollInside(el, dy) {
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.tagName === 'IFRAME') return true;
      if (el.scrollHeight > el.clientHeight + 1) {
        var oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && ((dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) || (dy < 0 && el.scrollTop > 0))) return true;
      }
      el = el.parentElement;
    }
    return false;
  }
  function frame(t) {
    var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 1 / 60;
    lastT = t;
    if (running) {
      cur += (tgt - cur) * (1 - Math.exp(-EASE * dt));
      if (Math.abs(tgt - cur) < 0.4) { cur = tgt; running = false; }
      window.scrollTo(0, cur);
    }
    paintPlx(running ? cur : window.scrollY);
    checkPending();
    if (running) requestAnimationFrame(frame); else { lastT = 0; loopOn = false; }
  }
  var loopOn = false;
  function kick() { if (!loopOn) { loopOn = true; requestAnimationFrame(frame); } }
  function go(y) {
    if (!running) { cur = window.scrollY; maxYCache = 0; }
    tgt = Math.max(0, Math.min(maxY(), y));
    running = true;
    kick();
  }
  if (fine) {
    document.documentElement.classList.add('ichi-smooth');
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.defaultPrevented) return;
      var dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      if (canScrollInside(e.target, dy)) return;
      e.preventDefault();
      go((running ? tgt : window.scrollY) + dy);
    }, { passive: false });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      var el = id && document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      go(el.getBoundingClientRect().top + window.scrollY - 110);
      try { history.replaceState(null, '', '#' + id); } catch (er) {}
    });
  }
  /* キーボード・スクロールバー・タッチなどホイール以外の移動：パララックスだけ追従 */
  window.addEventListener('scroll', function () { if (!running) kick(); }, { passive: true });

  /* ───────── 写真パララックス（位置はキャッシュし、毎フレームのレイアウト読み取りをしない） ───────── */
  var plx = [];
  function clips(img) {
    var p = img.parentElement, i = 0;
    while (p && i < 3) { var o = getComputedStyle(p).overflow; if (o === 'hidden' || o === 'clip') return true; p = p.parentElement; i++; }
    return false;
  }
  function collectPlx() {
    var added = false;
    document.querySelectorAll('#top img').forEach(function (img) {
      if (img.dataset.plxChk) return;
      if (img.closest('[data-mq],[data-kd-loader],header,footer') || img.hasAttribute('data-ph-zoom')) { img.dataset.plxChk = '1'; return; }
      if (getComputedStyle(img).objectFit !== 'cover') return;
      img.dataset.plxChk = '1';
      if (!clips(img)) return;
      var box = img.parentElement;
      if (getComputedStyle(box).overflow === 'visible') box.style.overflow = 'hidden';
      img.setAttribute('data-plx', '1');
      plx.push({ img: img, box: box, top: 0, h: 0, last: null });
      added = true;
    });
    if (added) measure();
  }
  function measure() {
    var y = window.scrollY;
    for (var i = 0; i < plx.length; i++) {
      var r = plx[i].box.getBoundingClientRect();
      plx[i].top = r.top + y; plx[i].h = r.height;
    }
    maxYCache = 0;
    kick();
  }
  function paintPlx(y) {
    var vh = window.innerHeight;
    for (var i = 0; i < plx.length; i++) {
      var p = plx[i];
      var top = p.top - y;
      if (top + p.h < -120 || top > vh + 120) continue;
      var prog = ((top + p.h / 2) - vh / 2) / (vh / 2 + p.h / 2);
      if (prog > 1) prog = 1; else if (prog < -1) prog = -1;
      var py = Math.round(prog * p.h * -PLX_SHIFT * 10) / 10;
      if (py !== p.last) { p.img.style.translate = '0 ' + py + 'px'; p.last = py; }
    }
  }
  window.addEventListener('resize', function () { measure(); });
  if (window.ResizeObserver) {
    var rt = null;
    new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(measure, 150); }).observe(document.body);
  }

  /* ───────── 動きの一時停止ボタン（WCAG 2.2.2）— マーキーがあるページのみ ───────── */
  var btn = null;
  function ensureBtn() {
    if (btn || !document.querySelector('[data-mq-track]')) return;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ichi-mq-btn';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', '動きを止める');
    btn.title = '動きを止める';
    btn.innerHTML = '<span aria-hidden="true">❚❚</span>';
    btn.addEventListener('click', function () {
      var on = document.documentElement.classList.toggle('mq-paused');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var lb = on ? '動きを再開' : '動きを止める';
      btn.setAttribute('aria-label', lb);
      btn.title = lb;
      btn.innerHTML = on ? '<span aria-hidden="true">▶</span>' : '<span aria-hidden="true">❚❚</span>';
    });
    document.body.appendChild(btn);
  }

  /* ───────── 写真のカーテン表示（左→右）。CMSロック領域・ヒーロー・マーキーは対象外 ─────────
     判定はスクロール毎フレームの位置計算で行い、取りこぼしても数秒後に必ず表示する */
  var pending = [];
  function checkPending(y) {
    if (!pending.length) return;
    var vh = window.innerHeight || 800;
    pending = pending.filter(function (p) {
      if (p.img.dataset.cvDone || !p.img.isConnected) return false;
      var r = p.img.getBoundingClientRect();
      if (r.height === 0 || (r.top < vh * 0.92 && r.bottom > 0)) { open(p.img); return false; }
      return true;
    });
  }
  function open(img) {
    if (img.dataset.cvDone) return;
    img.dataset.cvDone = '1';
    img.style.transition = 'clip-path 1.2s cubic-bezier(.77,0,.18,1)';
    img.style.clipPath = 'inset(0 0 0 0)';
    setTimeout(function () { img.style.clipPath = ''; img.style.transition = ''; }, 1400);
  }
  function scan() {
    ensureBtn();
    collectPlx();
    var vh = window.innerHeight || 800;
    document.querySelectorAll('#top section:not(#pagehead) img').forEach(function (img) {
      if (img.dataset.cv) return;
      if (img.closest('[data-mq],[class*="parts"],[data-kd-loader],form')) return;
      img.dataset.cv = '1';
      var r = img.getBoundingClientRect();
      if (r.height === 0 || (r.top < vh && r.bottom > 0)) { img.dataset.cvDone = '1'; return; }
      img.style.clipPath = 'inset(0 100% 0 0)';
      pending.push({ img: img });
      /* 安全策：何があっても12秒後には表示 */
      setTimeout(function () { open(img); }, 12000);
    });
  }
  var t = null;
  var mo = new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 150); });
  function start() {
    scan();
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(measure, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
