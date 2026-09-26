(() => {
  document.documentElement.classList.add('js');
  const menu = document.querySelector('.menu');
  const nav = document.querySelector('#navigation');
  const close = () => { nav?.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false'); };
  menu?.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav?.classList.contains('open')) { close(); menu.focus(); } });
  matchMedia('(min-width: 961px)').addEventListener('change', close);
  const filters = document.querySelectorAll('[data-filter]');
  filters.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.filter;
    if (!['all', 'fiction', 'professional', 'personal'].includes(category)) return;
    filters.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    let count = 0;
    document.querySelectorAll('[data-category]').forEach(card => { card.hidden = category !== 'all' && card.dataset.category !== category; if (!card.hidden) count++; });
    const status = document.querySelector('[data-count]');
    if (status) status.textContent = `${count} ${count === 1 ? 'book' : 'books'} in this selection`;
  }));
  document.querySelectorAll('[data-workflow]').forEach(button => button.addEventListener('click', () => {
    const target = document.getElementById(`workflow-${button.dataset.workflow}`);
    if (!target) return;
    document.querySelectorAll('[data-workflow]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelectorAll('[data-workflow-panel]').forEach(panel => panel.hidden = panel !== target);
  }));
  document.querySelectorAll('[data-billing]').forEach(button => button.addEventListener('click', () => {
    const yearly = button.dataset.billing === 'yearly';
    document.querySelectorAll('[data-billing]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelectorAll('[data-monthly]').forEach(price => price.textContent = `$${yearly ? Number(price.dataset.yearly).toLocaleString('en-US') : price.dataset.monthly}`);
    document.querySelectorAll('[data-period]').forEach(el => el.textContent = yearly ? '/ year' : '/ month');
    document.querySelectorAll('[data-billing-note]').forEach(el => el.textContent = yearly ? 'One annual payment. Allowances refresh monthly.' : 'Billed monthly. Allowances refresh monthly.');
    document.querySelectorAll('[data-plan-link]').forEach(link => { const url = new URL(link.href); url.searchParams.set('billing', yearly ? 'annual' : 'monthly'); link.href = url.toString(); });
  }));
})();
// Local orientation only: never scores quality, saves answers, or submits a manuscript.
(() => {
  const form = document.querySelector('.route-guide');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const stage = form.querySelector('#book-stage').value;
    const direction = form.querySelector('#book-direction').value;
    if (!['idea','draft','finished'].includes(stage) || !['independent','human','imprint'].includes(direction)) return;
    let title,copy,url;
    if (direction === 'human') { title='Discuss a defined scope of support.'; copy='Explain your manuscript stage and the editorial, writing, or production work you want help with. Services are separately quoted.'; url='/publishing/services/'; }
    else if (direction === 'imprint' && stage === 'finished') { title='Understand manuscript review.'; copy='Read the editorial criteria and confirm the paid review’s scope, timing, and feedback before purchasing. This guide does not predict acceptance.'; url='/publishing/manuscript-review/'; }
    else if (stage === 'finished') { title='Prepare your independent release.'; copy='Explore paid-plan exports, final-file checks, and the publishing responsibilities you will manage.'; url='/first-mate/export/'; }
    else { title=stage === 'idea' ? 'Give the idea a useful brief.' : 'Give the draft a deliberate next pass.'; copy=direction === 'imprint' ? 'The final-review offer is for finished manuscripts. Develop the work first; you can explore imprint consideration when the manuscript is ready.' : 'Use a connected writing process, keeping your reader, manuscript, and project decisions in view.'; url=stage === 'idea' ? '/resources/book-brief/' : '/resources/revision-passes/'; }
    form.querySelector('[data-route-title]').textContent=title;
    form.querySelector('[data-route-copy]').textContent=copy;
    form.querySelector('[data-route-link]').href=url;
    form.querySelector('.route-result').hidden=false;
  });
})();
// Apply only the authored catalog categories supplied by an invitation.
(() => {
  const category = new URLSearchParams(location.search).get('category');
  if (!['fiction','professional','personal'].includes(category)) return;
  document.querySelector(`[data-filter="${category}"]`)?.click();
})();
