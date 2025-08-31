/* wishlist-fix.js
 * Mobile-safe wishlist portal that avoids transformed ancestors trapping `position: fixed`.
 * Drop-in: include AFTER your existing main.js
 */
(function(){
  // 0) Ensure viewport meta exists for consistent mobile layout
  if (!document.querySelector('meta[name="viewport"]')) {
    const m = document.createElement('meta');
    m.name = 'viewport';
    m.content = 'width=device-width, initial-scale=1';
    document.head.appendChild(m);
  }

  // 1) Inject minimal CSS for portal drawer and overlay
  const css = `
  .wishlist-root{position:fixed; inset:0; z-index:10000; pointer-events:none}
  .wishlist-root.is-open{pointer-events:auto}
  .wishlist-overlay{position:fixed; inset:0; background:rgba(0,0,0,.5); opacity:0; transition:opacity .2s}
  .wishlist-root.is-open .wishlist-overlay{opacity:1}
  .wishlist-panel{position:fixed; top:0; right:0; height:100vh; width:min(92vw,420px); background:#fff;
    transform:translateX(100%); transition:transform .25s ease; overflow:auto; -webkit-overflow-scrolling:touch;
    box-shadow:0 10px 30px rgba(0,0,0,.2)}
  .wishlist-root.is-open .wishlist-panel{transform:translateX(0)}
  .wishlist-header{display:flex; align-items:center; justify-content:space-between; padding:16px; border-bottom:1px solid #eee}
  .wishlist-body{padding:12px 16px}
  .wishlist-close{font-size:24px; line-height:1; background:none; border:0; cursor:pointer}
  body.modal-open{overflow:hidden; touch-action:none; overscroll-behavior:contain}
  @media (max-width:768px){
    header, nav, .app, .container, .sticky, [data-sticky], [data-transform-parent]{
      transform:none !important; filter:none !important; perspective:none !important;
    }
  }`;
  const style = document.createElement('style');
  style.setAttribute('data-wishlist-fix','');
  style.textContent = css;
  document.head.appendChild(style);

  // 2) Build portal DOM at top-level (end of <body>) to avoid transformed parents
  const ROOT_ID = 'wishlist-root';
  function buildPortal(){
    if (document.getElementById(ROOT_ID)) return;
    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'wishlist-root';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="wishlist-overlay" data-wishlist-close></div>
      <aside class="wishlist-panel" role="dialog" aria-modal="true" aria-labelledby="wishlist-title">
        <header class="wishlist-header">
          <h2 id="wishlist-title">Wishlist</h2>
          <button class="wishlist-close" type="button" aria-label="Close" data-wishlist-close>&times;</button>
        </header>
        <div class="wishlist-body" id="wishlist-items"></div>
      </aside>`;
    document.body.appendChild(root);
  }

  function ensurePortal(){
    let root = document.getElementById(ROOT_ID);
    if (!root) { buildPortal(); root = document.getElementById(ROOT_ID); }
    if (root.parentElement !== document.body) document.body.appendChild(root);
    return root;
  }

  function renderItems(){
    // If your app exposes a renderer, use it. Otherwise, no-op.
    if (typeof window.renderWishlistItems === 'function') {
      window.renderWishlistItems(document.getElementById('wishlist-items'));
      return;
    }
    // Fallback minimal render from localStorage if present
    try {
      const el = document.getElementById('wishlist-items');
      if (!el) return;
      const raw = localStorage.getItem('wishlist') || localStorage.getItem('WISHLIST') || '[]';
      const items = JSON.parse(raw);
      if (!Array.isArray(items) || items.length === 0) {
        el.innerHTML = '<p>No items in wishlist.</p>';
        return;
      }
      const rows = items.map((it, i) => {
        if (it && typeof it === 'object') {
          const name = it.name || it.title || it.id || `Item ${i+1}`;
          const qty = it.quantity != null ? ` × ${it.quantity}` : '';
          return `<div>${name}${qty}</div>`;
        }
        return `<div>${String(it)}</div>`;
      }).join('');
      el.innerHTML = rows;
    } catch(_) {}
  }

  function openWishlist(){
    const root = ensurePortal(); if (!root) return;
    root.classList.add('is-open');
    document.body.classList.add('modal-open');
    renderItems();
    const btn = root.querySelector('.wishlist-close'); if (btn) btn.focus();
  }

  function closeWishlist(){
    const root = document.getElementById(ROOT_ID); if (!root) return;
    root.classList.remove('is-open');
    document.body.classList.remove('modal-open');
  }

  // 3) Global event bindings
  document.addEventListener('click', function(e){
    const t = e.target;
    if (t.closest('[data-wishlist-open]')) { e.preventDefault(); openWishlist(); }
    if (t.closest('[data-wishlist-close]')) { e.preventDefault(); closeWishlist(); }
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') closeWishlist();
  });

  // 4) Build portal on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildPortal);
  } else {
    buildPortal();
  }

  // 5) Export helpers for debugging
  window.openWishlist = openWishlist;
  window.closeWishlist = closeWishlist;
})();