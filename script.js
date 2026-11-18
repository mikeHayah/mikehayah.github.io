const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

// Assemble email links at runtime so the address is not in the HTML for scrapers.
for (const link of document.querySelectorAll('[data-email-user]')) {
  const address = `${link.dataset.emailUser}@${link.dataset.emailDomain}`;
  link.href = `mailto:${address}`;
  if (link.hasAttribute('data-email-text')) link.textContent = address;
}

// Affiliation pills open the matching reference letter (PDF) in a modal dialog.
const docDialog = document.getElementById('doc-dialog');
if (docDialog && typeof docDialog.showModal === 'function') {
  const kicker = docDialog.querySelector('.doc-dialog-kicker');
  const title = docDialog.querySelector('.doc-dialog-title');
  const body = docDialog.querySelector('.doc-dialog-body');
  const openLink = docDialog.querySelector('.doc-dialog-open');
  // Android Chrome and some mobile browsers cannot render PDFs inside a page.
  const canEmbedPdf = navigator.pdfViewerEnabled !== false;

  const message = (text) => {
    const p = document.createElement('p');
    p.className = 'doc-dialog-message';
    p.textContent = text;
    return p;
  };

  for (const button of document.querySelectorAll('.affiliations [data-doc-title]')) {
    button.addEventListener('click', () => {
      const src = button.dataset.doc;
      kicker.textContent = 'Reference letter';
      docDialog.classList.remove('is-media');
      title.textContent = button.dataset.docTitle;
      openLink.hidden = !src;
      if (src) openLink.href = src;
      docDialog.classList.toggle('is-short', !src || !canEmbedPdf);

      if (!src) {
        const soon = document.createElement('div');
        soon.className = 'doc-dialog-soon';
        if (button.dataset.docLogo) {
          const logo = document.createElement('img');
          logo.className = 'doc-dialog-logo';
          logo.src = button.dataset.docLogo;
          logo.alt = `${button.dataset.docTitle} logo`;
          soon.append(logo);
        }
        soon.append(message('Will be available soon.'));
        body.replaceChildren(soon);
      } else if (canEmbedPdf) {
        const frame = document.createElement('iframe');
        frame.className = 'doc-dialog-frame';
        frame.title = `Reference letter — ${button.dataset.docTitle}`;
        frame.src = `${src}#view=FitH`;
        body.replaceChildren(frame);
      } else {
        body.replaceChildren(message('This browser can’t display PDFs inside the page. Use “Open PDF” to view it.'));
      }
      docDialog.showModal();
    });
  }

  // Project animations open full size in the same dialog (without JS the link opens the GIF).
  for (const link of document.querySelectorAll('[data-zoom]')) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const source = link.querySelector('img');
      const image = document.createElement('img');
      image.className = 'doc-dialog-media';
      image.src = source.currentSrc || source.src;
      image.alt = source.alt;
      kicker.textContent = 'Project animation';
      title.textContent = link.closest('.slide')?.querySelector('.slide-title')?.textContent ?? '';
      openLink.hidden = true;
      docDialog.classList.remove('is-short');
      docDialog.classList.add('is-media');
      body.replaceChildren(image);
      docDialog.showModal();
    });
  }

  docDialog.querySelector('.doc-dialog-close').addEventListener('click', () => docDialog.close());
  // A click on the backdrop lands on the <dialog> itself; clicks on its content land on children.
  docDialog.addEventListener('click', (e) => { if (e.target === docDialog) docDialog.close(); });
  // Drop the iframe on close so the PDF is unloaded.
  docDialog.addEventListener('close', () => body.replaceChildren());
}

// Projects slider. The track is a native horizontal scroll-snap container, so swipe and
// trackpad scrolling work on their own; this adds tabs, arrows, a counter, keyboard support
// and click-to-move on the neighbouring panels that peek in at the sides.
const slider = document.querySelector('[data-slider]');
if (slider) {
  const track = slider.querySelector('.slider-track');
  const tabList = slider.querySelector('.slider-tabs');
  const slides = [...track.querySelectorAll('.slide')];
  const tabs = slides.map((slide) => tabList.querySelector(`[aria-controls="${slide.id}"]`));
  const prev = slider.querySelector('[data-slide-prev]');
  const next = slider.querySelector('[data-slide-next]');
  const counter = slider.querySelector('[data-slide-current]');
  const projects = document.getElementById('projects');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const behavior = () => (reduceMotion.matches ? 'auto' : 'smooth');
  const pad = (n) => String(n).padStart(2, '0');
  const leftOf = (index) => slides[index].offsetLeft - slides[0].offsetLeft;
  let current = -1;

  slider.querySelector('[data-slide-total]').textContent = pad(slides.length);
  slider.style.setProperty('--n', slides.length);

  const setActive = (index) => {
    if (index === current) return;
    current = index;
    slides.forEach((slide, i) => {
      slide.inert = i !== index;
      slide.classList.toggle('is-active', i === index);
    });
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    counter.textContent = pad(index + 1);
    slider.style.setProperty('--i', index);
    // Keep the active tab visible when the tab row scrolls (phones), without moving the page.
    const tab = tabs[index];
    tabList.scrollTo({ left: tab.offsetLeft - (tabList.clientWidth - tab.offsetWidth) / 2, behavior: behavior() });
  };

  let settle;
  const goTo = (index, smooth = true) => {
    const target = Math.max(0, Math.min(slides.length - 1, index));
    clearTimeout(settle); // a check queued by an earlier scroll would see the old position
    track.scrollTo({ left: leftOf(target), behavior: smooth ? behavior() : 'auto' });
    setActive(target);
  };

  // Once a swipe comes to rest on a slide, that slide becomes active. Positions between
  // slides (a smooth scroll still under way) are ignored; snapping always ends on a slide.
  track.addEventListener('scroll', () => {
    clearTimeout(settle);
    settle = setTimeout(() => {
      const index = slides.findIndex((_, i) => Math.abs(leftOf(i) - track.scrollLeft) < 6);
      if (index >= 0) setActive(index);
    }, 90);
  }, { passive: true });

  prev.addEventListener('click', () => goTo(current - 1));
  next.addEventListener('click', () => goTo(current + 1));

  tabList.addEventListener('keydown', (e) => {
    const keys = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: slides.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    goTo(keys[e.key]);
    tabs[current].focus({ preventScroll: true });
  });

  // Tabs and the theme links in About point at #project-…; show that slide instead of jumping.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#project-"]');
    const index = link ? slides.findIndex((slide) => `#${slide.id}` === link.hash) : -1;
    if (index < 0) return;
    e.preventDefault();
    const inSlider = slider.contains(link);
    goTo(index, inSlider);
    if (!inSlider) projects.scrollIntoView({ behavior: behavior() });
  });

  // Images in off-screen slides never intersect the viewport, so native lazy loading would
  // only fetch them once shown. Start loading them all when the slider comes near.
  new IntersectionObserver((entries, observer) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    slider.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
    observer.disconnect();
  }, { rootMargin: '400px 0px' }).observe(slider);

  // Inactive panels are inert, so a click on a peeking neighbour lands on the track itself.
  track.addEventListener('click', (e) => {
    if (e.target !== track) return;
    const { left, right } = slides[current].getBoundingClientRect();
    if (e.clientX < left) goTo(current - 1);
    else if (e.clientX > right) goTo(current + 1);
  });

  // A window resize (rotation, zoom) can shift or reset the track's scroll offset; put the
  // current slide back before the scroll handler mistakes that for a swipe.
  addEventListener('resize', () => requestAnimationFrame(() => track.scrollTo({ left: leftOf(current) })));

  slider.classList.add('is-ready');
  goTo(Math.max(0, slides.findIndex((slide) => `#${slide.id}` === location.hash)), false);
}

const tocLinks = [...document.querySelectorAll('.toc a')];
const sectionObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    for (const link of tocLinks) {
      if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }
}, { rootMargin: '-30% 0px -60% 0px' });
document.querySelectorAll('main section[id]').forEach((section) => sectionObserver.observe(section));

const canvas = document.getElementById('molecule');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mulberry = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const mul = (a, s) => a.map((v) => v * s);
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const unit = (a) => mul(a, 1 / len(a));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

  // Drug-like toy molecules: 2–3 six-membered rings joined by short linkers, plus substituents.
  const buildMolecule = (seed) => {
    const rand = mulberry(seed);
    const randUnit = () => {
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      return [s * Math.cos(th), s * Math.sin(th), u];
    };
    const atoms = [];
    const bonds = [];
    const rings = [];
    const isClear = (p) => atoms.every((a) => len(sub(a.p, p)) > 1.2);
    const addAtom = (p, el) => { atoms.push({ p, el, deg: 0 }); return atoms.length - 1; };
    const bond = (i, j) => { bonds.push([i, j]); atoms[i].deg++; atoms[j].deg++; };

    const ringPositions = (center, u) => {
      const v = unit(cross(u, randUnit()));
      return Array.from({ length: 6 }, (_, k) => {
        const a = (k * Math.PI) / 3;
        return add(center, add(mul(u, 1.4 * Math.cos(a)), mul(v, 1.4 * Math.sin(a))));
      });
    };
    const commitRing = (positions, center, linkFrom) => {
      const hetero = rand() < 0.45 ? 2 + Math.floor(rand() * 3) : -1;
      const idx = positions.map((p, k) => addAtom(p, k === hetero ? 'N' : 'C'));
      idx.forEach((id, k) => bond(id, idx[(k + 1) % 6]));
      if (linkFrom !== null) bond(linkFrom, idx[0]);
      rings.push({ center, idx });
    };

    commitRing(ringPositions([0, 0, 0], randUnit()), [0, 0, 0], null);
    const ringTarget = rand() < 0.55 ? 3 : 2;
    for (let attempt = 0; attempt < 60 && rings.length < ringTarget; attempt++) {
      const ring = rings[Math.floor(rand() * rings.length)];
      const from = ring.idx[Math.floor(rand() * 6)];
      if (atoms[from].deg !== 2) continue;
      const dir = unit(sub(atoms[from].p, ring.center));
      const linker = [];
      let pos = atoms[from].p;
      const linkerLength = rand() < 0.45 ? 0 : 1 + Math.floor(rand() * 2);
      for (let l = 0; l < linkerLength; l++) {
        pos = add(pos, mul(unit(add(dir, mul(randUnit(), 0.45))), 1.5));
        linker.push(pos);
      }
      const ringStart = add(pos, mul(dir, 1.45));
      const center = add(ringStart, mul(dir, 1.4));
      const positions = ringPositions(center, mul(dir, -1));
      if (![...linker, ...positions].every(isClear)) continue;
      let prev = from;
      for (const p of linker) {
        const id = addAtom(p, rand() < 0.25 ? 'N' : 'C');
        bond(prev, id);
        prev = id;
      }
      commitRing(positions, center, prev);
    }

    for (const ring of rings) {
      for (const id of ring.idx) {
        if (atoms[id].deg !== 2 || rand() > 0.38) continue;
        const dir = unit(sub(atoms[id].p, ring.center));
        const p = add(atoms[id].p, mul(dir, 1.35));
        if (!isClear(p)) continue;
        const r = rand();
        const el = r < 0.4 ? 'O' : r < 0.6 ? 'N' : 'C';
        const sid = addAtom(p, el);
        bond(id, sid);
        if (el === 'C' && rand() < 0.6) {
          const p2 = add(p, mul(unit(add(dir, mul(randUnit(), 0.6))), 1.4));
          if (isClear(p2)) bond(sid, addAtom(p2, rand() < 0.6 ? 'O' : 'N'));
        }
      }
    }

    const centroid = mul(atoms.reduce((s, a) => add(s, a.p), [0, 0, 0]), 1 / atoms.length);
    atoms.forEach((a) => { a.p = sub(a.p, centroid); });
    const radius = Math.max(...atoms.map((a) => len(a.p)));
    atoms.forEach((a) => { a.p = mul(a.p, 1 / radius); });
    return { atoms, bonds };
  };

  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
  const rgb = (c) => `rgb(${c.join(',')})`;

  let palette;
  const readPalette = () => {
    const s = getComputedStyle(document.documentElement);
    const v = (name) => hexToRgb(s.getPropertyValue(name).trim());
    palette = { C: v('--ink'), N: v('--accent'), O: v('--warm'), noise: v('--accent-2'), bond: v('--muted'), bg: v('--bg'), accent: v('--accent') };
  };
  readPalette();

  const DENOISE = 3.8;
  const HOLD = 4.4;
  const NOISE = 1.8;
  const easeInOut = (x) => 0.5 - Math.cos(Math.PI * x) / 2;

  let sample = 0;
  let mol;
  let noise;
  let elapsed = 0;
  const nextSample = () => {
    sample++;
    mol = buildMolecule(sample * 7919 + 101);
    noise = mol.atoms.map(() => ({ eps: [gauss(), gauss(), gauss()].map((g) => g * 0.75), phase: Math.random() * Math.PI * 2 }));
    elapsed = 0;
  };
  nextSample();

  let rx = -0.35;
  let ry = 0.4;
  let width = 0;
  let height = 0;
  let clock = 0;

  const state = () => {
    if (reduceMotion) return { t: 0, label: 'sample' };
    if (elapsed < DENOISE) return { t: 1 - easeInOut(elapsed / DENOISE), label: 'denoising' };
    if (elapsed < DENOISE + HOLD) return { t: 0, label: 'sample' };
    return { t: easeInOut(Math.min(1, (elapsed - DENOISE - HOLD) / NOISE)), label: 'adding noise' };
  };

  const draw = () => {
    if (!width || !height) return;
    const { t, label } = state();
    ctx.clearRect(0, 0, width, height);

    const size = Math.min(width, height);
    const scale = Math.max(size * 0.6, 120);
    const unitPx = size / 240;
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
    const alpha = Math.cos((t * Math.PI) / 2);
    const sigma = Math.sin((t * Math.PI) / 2);
    // Coarse-to-fine, as in the paper: geometry settles first, then atom types, then bonds.
    const typeReveal = clamp((0.5 - t) / 0.35);
    const bondReveal = clamp((0.28 - t) / 0.22);

    const projected = mol.atoms.map((a, i) => {
      const n = noise[i];
      const wobble = 0.12 * sigma;
      const p = add(mul(a.p, alpha), mul(add(n.eps, [Math.sin(clock * 1.7 + n.phase), Math.cos(clock * 1.3 + n.phase), Math.sin(clock * 1.1 + n.phase * 2)].map((w) => w * wobble)), sigma));
      const x1 = p[0] * cy + p[2] * sy;
      const z1 = -p[0] * sy + p[2] * cy;
      const y1 = p[1] * cx - z1 * sx;
      const z = p[1] * sx + z1 * cx;
      const f = 1 / (1 + z * 0.3);
      return { x: width / 2 + x1 * scale * f, y: height / 2 + y1 * scale * f, z, f, el: a.el };
    });

    if (bondReveal > 0) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgb(palette.bond);
      for (const [i, j] of mol.bonds) {
        const a = projected[i];
        const b = projected[j];
        ctx.globalAlpha = bondReveal * (0.3 + 0.45 * (1 - (a.z + b.z + 2) / 4));
        ctx.lineWidth = 1.7 * unitPx * ((a.f + b.f) / 2);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (const p of [...projected].sort((a, b) => b.z - a.z)) {
      const depth = clamp(1 - (p.z + 1) / 2);
      const hetero = p.el !== 'C';
      const r = (2.6 + typeReveal * (hetero ? 3.2 : 1.8)) * unitPx * p.f;
      ctx.globalAlpha = 0.35 + 0.65 * depth;
      ctx.fillStyle = mix(palette.noise, palette[p.el], typeReveal);
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = (hetero && typeReveal > 0.9) || t > 0.15 ? 10 * unitPx : 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.6 * unitPx;
      ctx.strokeStyle = rgb(palette.bg);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Readout: diffusion time and progress.
/*     ctx.font = `500 ${Math.max(10, 10.5 * unitPx)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = rgb(palette.bond);
    ctx.fillText(`t = ${t.toFixed(2)}`, 0, 2);
    ctx.textAlign = 'right';
    ctx.fillText(`sample ${String(sample).padStart(2, '0')}`, width, 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = mix(palette.noise, palette.accent, typeReveal);
    ctx.fillText(label, 0, 2 + 15 * Math.max(1, unitPx)); */

    const barY = height - 2;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = rgb(palette.bond);
    ctx.fillRect(0, barY, width, 1.5);
    ctx.globalAlpha = 1;
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, rgb(palette.accent));
    gradient.addColorStop(1, rgb(palette.noise));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, barY, width * (1 - t), 1.5);
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  };
  new ResizeObserver(resize).observe(canvas);

  let dragging = false;
  let last = [0, 0];
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    last = [e.clientX, e.clientY];
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    ry += (e.clientX - last[0]) * 0.01;
    rx += (e.clientY - last[1]) * 0.01;
    last = [e.clientX, e.clientY];
    draw();
  });
  const release = () => { dragging = false; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readPalette(); draw(); });

  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(canvas);

  if (!reduceMotion) {
    let previous = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      if (visible && !document.hidden) {
        clock += dt;
        elapsed += dt;
        if (!dragging) ry += dt * 0.28;
        if (elapsed > DENOISE + HOLD + NOISE) nextSample();
        draw();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
