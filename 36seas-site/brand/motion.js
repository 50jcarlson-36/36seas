(() => {
  'use strict';
  const root = document.documentElement;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1000px) and (pointer: fine)');
  const key = '36seas.reducedMotion.v1';
  let chosen = false;
  try { chosen = localStorage.getItem(key) === '1'; } catch { /* Optional preference. */ }
  const animations = new Set();
  let observer, depthObserver, depth, raf = 0, visible = false;
  const artwork = document.querySelector('.hero-art, .hero-visual, .book-detail-art');
  let footer = document.querySelector('footer');
  if (!footer) { footer = document.createElement('div'); footer.className = 'motion-settings'; document.body.append(footer); }
  const toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'motion-preference';
  footer?.append(toggle);
  const reduced = () => chosen || preference.matches;
  function frame() {
    raf = 0;
    if (!depth || !visible || document.hidden || reduced()) return;
    const rect = artwork.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)));
    depth.currentTime = progress * 1000;
  }
  function schedule() {
    if (depth && visible && !document.hidden && !reduced() && !raf) raf = requestAnimationFrame(frame);
  }
  function configure() {
    observer?.disconnect(); depthObserver?.disconnect();
    animations.forEach(a => a.cancel()); animations.clear();
    depth?.cancel(); depth = null; cancelAnimationFrame(raf); raf = 0;
    root.classList.toggle('motion-reduced', reduced());
    toggle.textContent = preference.matches ? 'Reduced motion · device setting' : chosen ? 'Enable motion' : 'Reduce motion';
    toggle.setAttribute('aria-pressed', String(reduced()));
    toggle.disabled = preference.matches;
    if (reduced() || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || document.hidden) continue;
        observer.unobserve(entry.target);
        if (entry.target.dataset.motionSeen) continue;
        entry.target.dataset.motionSeen = 'true';
        const animation = entry.target.animate([
          {opacity: .55, transform: 'translateY(12px)'},
          {opacity: 1, transform: 'translateY(0)'}
        ], {duration: 520, easing: 'cubic-bezier(.22,1,.36,1)'});
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      }
    }, {threshold: .12});
    // Observe small editorial blocks, never the LCP, forms, or individual plan cards.
    document.querySelectorAll('main .section-head, main .split-copy, main .book-card, main .section-intro, main .text-columns, main .resource-grid, main .plans').forEach(el => {
      if (el.getBoundingClientRect().top > innerHeight && !el.dataset.motionSeen) observer.observe(el);
    });
    if (artwork && desktop.matches && !navigator.connection?.saveData) {
      depth = artwork.animate([{translate: '0 8px'}, {translate: '0 -8px'}], {duration: 1000, fill: 'both'});
      depth.pause(); depth.currentTime = 500;
      depthObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); });
      depthObserver.observe(artwork);
    }
  }
  toggle.addEventListener('click', () => {
    chosen = !chosen;
    try { localStorage.setItem(key, chosen ? '1' : '0'); } catch { /* Still works for this page. */ }
    configure();
  });
  preference.addEventListener('change', configure);
  desktop.addEventListener('change', configure);
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule, {passive: true});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; animations.forEach(a => a.finish()); }
    else schedule();
  });
  addEventListener('pagehide', () => { cancelAnimationFrame(raf); animations.forEach(a => a.cancel()); });
  configure();
})();
