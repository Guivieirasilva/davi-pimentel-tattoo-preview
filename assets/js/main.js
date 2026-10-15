/* Davi Pimentel Tattoo — main.js (módulo ES, sem dependências)
   Menu, filtros, lightbox, reveal, botão flutuante. Ver SPEC seção 10.
   Todo seletor é verificado: nada quebra se um elemento não existir. */

const html = document.documentElement;
html.classList.remove('no-js');

const body = document.body;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasIO = 'IntersectionObserver' in window;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const visible = (el) => el.getClientRects().length > 0;

/* ---------- 0. Modo de revisão (#revisao ou ?revisao): mostra os placeholders ---------- */
if (location.hash === '#revisao' || /[?&]revisao(?:[=&]|$)/.test(location.search)) {
  body.dataset.portrait = 'placeholder';
  body.dataset.gallery = 'placeholder';
  body.dataset.wall = 'placeholder';
}

/* ---------- Trava de rolagem compartilhada (drawer e lightbox) ---------- */
let navOpen = false;
let lbOpen = false;
const syncLock = () => html.classList.toggle('is-locked', navOpen || lbOpen);

/* ---------- 10.1 Cabeçalho ao rolar + item ativo do menu ---------- */
const header = $('.topo');
const sentinela = $('.sentinela');
if (header && sentinela && hasIO) {
  new IntersectionObserver(([e]) => header.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinela);
}

const navLinks = $$('.nav-links a[href^="#"]');
const navSections = navLinks.map((a) => $(a.hash)).filter(Boolean);
if (navSections.length && hasIO) {
  // Faixa de 40% a 50% da viewport: funciona também em seções mais altas que a tela.
  const ioNav = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const id = `#${e.target.id}`;
      navLinks.forEach((a) => {
        if (a.hash !== id) return;
        if (e.isIntersecting) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
  navSections.forEach((s) => ioNav.observe(s));
}

/* ---------- 10.2 Menu mobile (drawer) ---------- */
const toggle = $('.nav-toggle');
const panel = $('#nav-list');
const inertTargets = $$('main, footer, .float');
const desktopMQ = matchMedia('(min-width: 900px)');

function openNav() {
  if (!toggle || !panel || navOpen) return;
  navOpen = true;
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', 'Fechar menu');
  body.classList.add('nav-open');
  syncLock();
  inertTargets.forEach((el) => el.setAttribute('inert', ''));
  const first = $(FOCUSABLE, panel);
  if (first) first.focus();
}
function closeNav(restoreFocus = true) {
  if (!toggle || !navOpen) return;
  navOpen = false;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Abrir menu');
  body.classList.remove('nav-open');
  syncLock();
  inertTargets.forEach((el) => el.removeAttribute('inert'));
  if (restoreFocus) toggle.focus();
}
if (toggle && panel && header) {
  toggle.addEventListener('click', () => (navOpen ? closeNav() : openNav()));
  header.addEventListener('keydown', (e) => {
    if (!navOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeNav(); return; }
    if (e.key !== 'Tab') return;
    const items = $$(FOCUSABLE, header).filter(visible);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  // Link de âncora dentro do drawer: fecha e deixa o navegador rolar
  header.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a && navOpen) closeNav(false);
  });
  const onMQ = (e) => { if (e.matches) closeNav(false); };
  if (desktopMQ.addEventListener) desktopMQ.addEventListener('change', onMQ);
  else if (desktopMQ.addListener) desktopMQ.addListener(onMQ);
}

/* ---------- 10.3 Âncoras: foco na seção para o leitor de tela acompanhar ---------- */
function focusHash(hash) {
  if (!hash || hash.length < 2) return;
  let el = null;
  try { el = document.querySelector(hash); } catch (err) { return; }
  if (!el) return;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}
addEventListener('hashchange', () => focusHash(location.hash));
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const hash = a.getAttribute('href');
  if (hash === location.hash) requestAnimationFrame(() => focusHash(hash)); // mesmo hash não dispara hashchange
});

/* ---------- 10.4 Reveal ao rolar ---------- */
const reveals = $$('.reveal');
if (reduce || !hasIO) {
  html.classList.add('no-io');
} else if (reveals.length) {
  $$('.reveal-group').forEach((group) => {
    $$('.reveal', group).slice(0, 6).forEach((el, i) => { el.style.transitionDelay = `${i * 60}ms`; });
  });
  const ioReveal = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visible');
      ioReveal.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
  const vh = innerHeight;
  reveals.forEach((el) => {
    // O que já está na tela aparece sem transição (evita piscar ao remover .no-js)
    if (el.getBoundingClientRect().top < vh) el.classList.add('is-visible');
    else ioReveal.observe(el);
  });
}

// Foco por teclado nunca cai num controle invisível: revela os blocos ancestrais
document.addEventListener('focusin', (e) => {
  let el = e.target instanceof Element ? e.target.closest('.reveal') : null;
  while (el) {
    el.classList.add('is-visible');
    el = el.parentElement ? el.parentElement.closest('.reveal') : null;
  }
});

/* ---------- 10.5 Filtros do portfólio ---------- */
const galeria = $('.galeria');
const filtros = $('.filtros');
const filtroStatus = $('#filtro-status');
const galleryActive = body.dataset.gallery === 'live' || body.dataset.gallery === 'placeholder';
const catsOf = (li) => (li.dataset.cat || '').split(/\s+/).filter(Boolean);

if (galeria && filtros && galleryActive) {
  const items = $$(':scope > li', galeria);
  const present = new Set();
  items.forEach((li) => catsOf(li).forEach((c) => present.add(c)));
  $$('.chip', filtros).forEach((chip) => {
    const f = chip.dataset.filter;
    if (f !== 'all' && !present.has(f)) chip.remove();
  });
  // Com uma categoria só, filtrar não ajuda: esconde a barra
  if (present.size < 2) filtros.hidden = true;

  const announce = (n, label) => {
    if (!filtroStatus) return;
    let msg;
    if (n === 0) msg = 'Nenhum trabalho nesta categoria';
    else if (n === 1) msg = label ? `1 trabalho em ${label}` : '1 trabalho';
    else msg = label ? `${n} trabalhos em ${label}` : `${n} trabalhos`;
    filtroStatus.textContent = msg;
  };

  filtros.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const cat = chip.dataset.filter || 'all';
    $$('.chip', filtros).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    requestAnimationFrame(() => {
      let n = 0;
      items.forEach((li) => {
        const show = cat === 'all' || catsOf(li).includes(cat);
        if (show && li.hidden && !reduce) li.classList.add('is-entering');
        li.hidden = !show;
        if (show) n += 1;
      });
      announce(n, cat === 'all' ? '' : chip.textContent.trim());
    });
  });
  galeria.addEventListener('animationend', (e) => {
    if (e.target instanceof Element) e.target.classList.remove('is-entering');
  });
}

/* ---------- 10.6 Lightbox ---------- */
const lb = $('#lightbox');
if (lb && galeria && galleryActive) {
  const img = $('#lb-img');
  const ph = $('#lb-placeholder');
  const phLabel = $('#lb-placeholder-label');
  const cap = $('#lb-caption');
  const counter = $('#lb-counter');
  const status = $('#lb-status');
  const btnClose = $('#lb-close');
  const btnPrev = $('#lb-prev');
  const btnNext = $('#lb-next');
  const fig = $('.lb-figure', lb);
  const native = typeof HTMLDialogElement === 'function' && 'showModal' in HTMLDialogElement.prototype;
  let tiles = [];
  let idx = 0;
  let lastFocus = null;
  let swiped = false;

  const visibleTiles = () => $$(':scope > li:not([hidden]) .tile', galeria);
  const altOf = (tile) => {
    const i = tile.querySelector('img');
    if (i) return i.alt || '';
    const p = tile.querySelector('[aria-label]');
    return p ? p.getAttribute('aria-label') || '' : '';
  };
  const preload = (i) => {
    const t = tiles[(i + tiles.length) % tiles.length];
    if (t && t.dataset.full) new Image().src = t.dataset.full;
  };

  function render() {
    const tile = tiles[idx];
    if (!tile) return;
    const alt = altOf(tile);
    const label = tile.dataset.catLabel || '';
    const full = tile.dataset.full || '';
    const total = tiles.length;
    if (full && img) {
      if (ph) ph.hidden = true;
      img.hidden = false;
      if (!reduce) img.style.opacity = '0';
      img.onload = () => { img.style.opacity = ''; };
      img.onerror = () => { img.style.opacity = ''; };
      img.src = full;
      img.alt = alt;
    } else {
      if (img) img.hidden = true;
      if (ph) {
        ph.hidden = false;
        ph.setAttribute('aria-label', alt || 'Espaço reservado');
        const src = tile.querySelector('.placeholder-label');
        if (phLabel) phLabel.textContent = src ? src.textContent : '';
      }
    }
    if (cap) cap.textContent = label ? `${alt} · ${label}` : alt;
    if (counter) counter.textContent = `Imagem ${idx + 1} de ${total}`;
    if (status) status.textContent = `Imagem ${idx + 1} de ${total} — ${alt}`;
    preload(idx - 1);
    preload(idx + 1);
  }

  function setAriaHiddenSiblings(on) {
    Array.from(body.children).forEach((el) => {
      if (el === lb || el.tagName === 'SCRIPT' || el.tagName === 'TEMPLATE') return;
      if (on) el.setAttribute('aria-hidden', 'true');
      else el.removeAttribute('aria-hidden');
    });
  }

  function openLb(tile) {
    tiles = visibleTiles();
    idx = Math.max(0, tiles.indexOf(tile));
    lastFocus = tile;
    render();
    if (native) {
      lb.showModal();
    } else {
      lb.setAttribute('open', '');
      lb.classList.add('is-fallback');
      lb.setAttribute('role', 'dialog');
      lb.setAttribute('aria-modal', 'true');
      setAriaHiddenSiblings(true);
    }
    lbOpen = true;
    syncLock();
    body.classList.add('lightbox-open');
    if (btnClose) btnClose.focus();
  }

  function afterClose() {
    if (!lbOpen) return;
    lbOpen = false;
    syncLock();
    body.classList.remove('lightbox-open');
    if (!native) {
      lb.removeAttribute('open');
      lb.classList.remove('is-fallback');
      setAriaHiddenSiblings(false);
    }
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  function closeLb() {
    if (!lbOpen) return;
    if (native && lb.open) lb.close();
    afterClose(); // síncrono; o listener de 'close' vira no-op (guardado por lbOpen)
  }
  function step(dir) {
    if (!tiles.length) return;
    idx = (idx + dir + tiles.length) % tiles.length;
    render();
  }

  galeria.addEventListener('click', (e) => {
    const tile = e.target.closest('.tile');
    if (tile) openLb(tile);
  });
  if (btnClose) btnClose.addEventListener('click', closeLb);
  if (btnPrev) btnPrev.addEventListener('click', () => step(-1));
  if (btnNext) btnNext.addEventListener('click', () => step(1));

  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'Escape') { e.preventDefault(); closeLb(); }
    else if (e.key === 'Tab' && !native) {
      const items = $$(FOCUSABLE, lb).filter(visible);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  lb.addEventListener('cancel', (e) => { e.preventDefault(); closeLb(); });
  lb.addEventListener('close', afterClose);
  // Clique no backdrop (ou na área vazia da figura) fecha
  lb.addEventListener('click', (e) => {
    if (swiped) { swiped = false; return; }
    if (e.target === lb || e.target === fig) closeLb();
  });

  // Swipe horizontal
  if (fig) {
    let sx = 0;
    let sy = 0;
    let tracking = false;
    fig.addEventListener('pointerdown', (e) => {
      sx = e.clientX; sy = e.clientY; tracking = true; swiped = false;
      if (fig.setPointerCapture) { try { fig.setPointerCapture(e.pointerId); } catch (err) { /* sem captura */ } }
    });
    fig.addEventListener('pointerup', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dy) < 60) {
        swiped = true; // engole só o click sintético do mesmo gesto (mouse); toque não gera click
        setTimeout(() => { swiped = false; }, 400);
        step(dx < 0 ? 1 : -1);
      }
    });
    fig.addEventListener('pointercancel', () => { tracking = false; });
  }
}

/* ---------- 10.7 Botão flutuante ---------- */
const floatBtn = $('.float');
const heroBtn = $('#hero-cta');
const finalBtn = $('#cta-final-btn');
if (floatBtn) {
  if (hasIO) {
    let heroOut = !heroBtn;
    let finalIn = false;
    const update = () => floatBtn.classList.toggle('is-visible', heroOut && !finalIn);
    if (heroBtn) {
      new IntersectionObserver(([e]) => { heroOut = !e.isIntersecting; update(); }, { threshold: 0 }).observe(heroBtn);
    }
    const endZones = [finalBtn, $('#rodape')].filter(Boolean);
    if (endZones.length) {
      const inView = new Set();
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) inView.add(e.target); else inView.delete(e.target); });
        finalIn = inView.size > 0;
        update();
      }, { threshold: 0 });
      endZones.forEach((z) => io.observe(z));
    }
    update();
  } else {
    floatBtn.classList.add('is-visible');
  }
}

/* ---------- Topo: brilho e leve paralaxe seguindo o cursor (desktop) ---------- */
const stage = $('.hero-stage');
if (stage && !reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let raf = 0;
  let gx = 78;
  let gy = 42;
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    gx = ((e.clientX - r.left) / r.width) * 100;
    gy = ((e.clientY - r.top) / r.height) * 100;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      stage.style.setProperty('--gx', `${gx.toFixed(1)}%`);
      stage.style.setProperty('--gy', `${gy.toFixed(1)}%`);
      stage.style.setProperty('--px', (gx / 50 - 1).toFixed(3));
      stage.style.setProperty('--py', (gy / 50 - 1).toFixed(3));
    });
  });
}

/* ---------- 10.8 Ano do rodapé ---------- */
const ano = $('#ano');
if (ano) ano.textContent = String(new Date().getFullYear());
