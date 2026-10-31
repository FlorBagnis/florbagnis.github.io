/* Exportar portfolio a PDF (descarga directa) — archivo autónomo.
   No modifica tu código existente. Lee <html lang> y data-theme.
   - Oculta el formulario de consultas (y su desplegable) en el PDF y al imprimir.
   - Deja solo los botones Email / LinkedIn / GitHub y "Desarrollado por…". */
(function () {
  /* FOTO SIEMPRE CIRCULAR (celular y PC): la foto es un <img> de proporción vertical.
     Estos estilos van "en línea" con !important, que le gana a cualquier hoja de estilos:
     el ancho lo sigue marcando el CSS y el alto siempre queda igual al ancho (círculo perfecto, recortado con cover). */
  const fixFoto = () => {
    document.querySelectorAll('.foto-perfil').forEach(f => {
      [['aspect-ratio', '1 / 1'], ['height', 'auto'], ['min-height', '0'], ['max-height', 'none'],
       ['object-fit', 'cover'], ['object-position', 'center'], ['border-radius', '50%'], ['box-sizing', 'border-box']]
        .forEach(([p, v]) => f.style.setProperty(p, v, 'important'));
    });
  };
  fixFoto();
  window.addEventListener('load', fixFoto);

  const socials = document.querySelector('.header-socials');
  if (!socials) return;

  const T = {
    es: { label: 'PDF', title: 'Descargar portfolio en PDF', busy: 'Generando…', file: 'Florencia-Bagnis-Portfolio.pdf', doc: 'Florencia Bagnis — Portfolio', wait: 'Generando tu PDF… ✿', s1: 'Preparando…', s2: 'Cargando imágenes…', s3: 'Capturando tu portfolio…', s4: 'Armando el PDF…', s5: '¡Listo! ✿', err: 'No se pudo generar el PDF. Revisá tu conexión e intentá de nuevo.' },
    en: { label: 'PDF', title: 'Download portfolio as PDF', busy: 'Generating…', file: 'Florencia-Bagnis-Portfolio-EN.pdf', doc: 'Florencia Bagnis — Portfolio', wait: 'Generating your PDF… ✿', s1: 'Getting ready…', s2: 'Loading images…', s3: 'Capturing your portfolio…', s4: 'Building the PDF…', s5: 'Done! ✿', err: 'The PDF could not be generated. Check your connection and try again.' }
  };
  // Páginas: false = cada hoja mide lo que mide su contenido (sin espacio vacío).
  // true = todas las hojas A4 iguales (por si tu visor las espera del mismo tamaño; quedan con algo de aire abajo).
  const UNIFORM_PAGES = false;
  // true = el PDF copia la web con TODOS sus detalles (etiquetas mailto / ⌘C / /in / git, cursor de los títulos,
  // etiqueta demo.gif, sombras de tarjetas y botones). false = versión "limpia" anterior (sin esos adornos).
  const KEEP_DETAILS = true;
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'es');

  const btn = document.createElement('button');
  btn.id = 'export-pdf';
  btn.type = 'button';
  btn.className = 'export-pdf-btn';
  btn.innerHTML = '<i class="fas fa-file-lines"></i><span class="export-pdf-label" id="export-pdf-label"></span>';
  socials.appendChild(btn);

  let busy = false;
  let curVh = null;   // visor del portfolio (pantalla "Generando PDF…" + visor con Descargar / Volver)
  let lastUrl = null;
  let status = '';
  function updateTexts() {
    const t = T[lang()];
    document.getElementById('export-pdf-label').textContent = busy ? t.busy : (status || t.label);
    btn.title = t.title;
    btn.setAttribute('aria-label', t.title);
  }
  updateTexts();
  new MutationObserver(updateTexts).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  /* ---------- Ocultar formulario de consultas ---------- */
  // Selectores exactos del index.html (acordeón completo: título, intro, form, mensajes y mail)
  const FORM_SELECTOR = '#contacto .contact-accordion, #contacto details, #contactForm, #formSuccess, #formError, #copy-email-btn';

  function markFormBlocks(root) {
    root.querySelectorAll(FORM_SELECTOR).forEach(el => el.setAttribute('data-pdf-hide', ''));
    // Textos de "Conectamos" (ES/EN: "Let's connect") dentro de Contacto: no van en el PDF.
    // Se oculta solo el elemento más chico que contiene ese texto; los botones y el título "Contacto" quedan.
    const RX = /conectamos|let.?s\s+connect|let.?s\s+talk/i;
    root.querySelectorAll('#contacto *').forEach(el => {
      if (el.closest('.contact-grid') || el.querySelector('.contact-grid') || /^(SCRIPT|STYLE)$/.test(el.tagName)) return;
      if (!RX.test(el.textContent || '')) return;
      if (Array.from(el.children).some(c => RX.test(c.textContent || ''))) return;   // se queda el más interno
      el.setAttribute('data-pdf-hide', '');
    });
  }
  function unmarkFormBlocks() {
    document.querySelectorAll('[data-pdf-hide]').forEach(el => el.removeAttribute('data-pdf-hide'));
  }

  // Ctrl+P / imprimir desde el navegador
  window.addEventListener('beforeprint', () => markFormBlocks(document));
  window.addEventListener('afterprint', unmarkFormBlocks);

  /* ---------- Carga de librerías ---------- */
  const LIBS = [
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  ];
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('No cargó ' + src));
      document.head.appendChild(s);
    });
  }
  async function ensureLibs() {
    if (!window.html2canvas) await loadScript(LIBS[0]);
    if (!window.jspdf) await loadScript(LIBS[1]);
  }

  // Adornos con brillo/sombras difusas que html2canvas dibuja mal. Solo se sacan en la versión "limpia" (KEEP_DETAILS = false)
  const CLEAN_CSS = `
    body section > h2::after { content: none !important; display: none !important; }
    #contacto .contact-item::after, body #contacto .contact-grid > .contact-item::after { content: none !important; display: none !important; }
    body .projects-grid > .card { box-shadow: none !important; }
    body .projects-grid > .card .media-container { box-shadow: none !important; }
    body .projects-grid > .card .media-container::before,
    body .projects-grid > .card .media-container::after { content: none !important; display: none !important; }
    .button, .summary-pill, .tech-stack-general span, .project-tags span, .featured-badge, .availability, .contact-item { box-shadow: none !important; text-shadow: none !important; filter: none !important; }
  `;

  const HIDE_CSS = `
    *, *::before, *::after { animation: none !important; transition: none !important; }
    header, section { opacity: 1 !important; transform: none !important; }
    .card:hover, .summary-pill:hover { transform: none !important; }
    #proyectos .project-group, #proyectos .project-group.hide-card, #proyectos .card.hide-card { display: block !important; }
    .sticky-nav-wrapper, #panel-toggle, #float-panel, #back-to-top, .kawaii-bg-decor,
    .kawaii-modal, .gif-toggle-btn, .gif-zoom-btn, .project-filters, #export-pdf, #copy-email-btn,
    button[onclick^="openModal"], [data-pdf-hide], #contacto details, #contactForm { display: none !important; }
    #contacto .contact-item::before, #contacto .contact-item::after { content: none !important; display: none !important; }
    #contacto .contact-grid { display: flex !important; flex-wrap: wrap; justify-content: center; align-items: center; gap: 14px; }
    #contacto .contact-item { display: inline-flex !important; align-items: center; justify-content: center; gap: 8px; height: auto !important; min-height: 0 !important; padding: 12px 22px !important; line-height: 1.2; }
    /* Celular: botones de contacto compactos, centrados, con el texto bien al medio (sin altura de más) */
    @media (max-width: 600px) {
      #contacto .contact-grid { gap: 8px !important; flex-wrap: nowrap !important; }
      #contacto .contact-item { flex: 0 1 auto !important; width: auto !important; max-width: 100% !important; height: auto !important; min-height: 0 !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: center !important; justify-content: center !important; line-height: 1.2 !important; padding: 10px 12px !important; margin: 0 !important; position: relative !important; }
    }
    /* El footer ("Desarrollado por…") vuelve al flujo normal para que no se superponga */
    footer { position: static !important; transform: none !important; margin-top: 16px !important; margin-bottom: 0 !important; padding-bottom: 0 !important; clear: both; }
    #contacto { padding-bottom: 8px !important; margin-bottom: 0 !important; min-height: 0 !important; }
    ${KEEP_DETAILS ? '' : '#contacto .contact-item::before { content: none !important; display: none !important; }'}

    /* ---- Encabezado y foto de perfil: SIEMPRE igual que en la versión de escritorio (foto circular de 180px a la izquierda),
       también cuando el PDF se genera desde el celular. ---- */
    header { grid-template-columns: 180px 1fr !important; column-gap: 24px !important; text-align: left !important; }
    header .foto-perfil { grid-column: 1 !important; grid-row: 1 / span 4 !important; justify-self: auto !important; width: 180px !important; height: 180px !important; margin-bottom: 0 !important; }
    header > :not(.foto-perfil) { grid-column: 2 !important; }
    /* Foto BLINDADA: cuadrada, círculo perfecto, recortada con "cover" (nunca estirada) */
    header .foto-perfil { box-sizing: border-box !important; position: static !important; transform: none !important; max-width: none !important; max-height: none !important; min-width: 180px !important; min-height: 180px !important; aspect-ratio: 1 / 1 !important; flex: none !important; border-radius: 50% !important; overflow: hidden !important; align-self: center !important; object-fit: cover !important; object-position: center !important; }
    header h1 { justify-content: flex-start !important; }
    header .availability { justify-self: start !important; }
    header .header-socials { justify-content: flex-start !important; }

    /* ---- Sin manchas rosas: el punto del estado queda plano y sin animación ---- */
    .tk-dot { box-shadow: none !important; animation: none !important; transform: none !important; opacity: 1 !important; }
    ${KEEP_DETAILS ? '' : CLEAN_CSS}

    /* ---- Proyectos: TODOS uno debajo del otro, con el formato ancho de "Destacados" (GIF al costado) ---- */
    #proyectos .project-group[data-group] .projects-grid {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 26px !important;
    }
    @media (min-width: 821px) {
    #proyectos .project-group[data-group] .projects-grid > .card {
      --cp: 30px;
      display: grid !important;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) !important;
      grid-template-areas: "bar bar" "media badge" "media title" "media type" "media text" "media tags" "media buttons" !important;
      grid-template-rows: auto auto auto auto auto auto 1fr !important;
      column-gap: 30px !important;
      row-gap: 0 !important;
      grid-row: auto !important;
    }
    #proyectos .project-group[data-group] .projects-grid > .card:nth-child(even) {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) !important;
      grid-template-areas: "bar bar" "badge media" "title media" "type media" "text media" "tags media" "buttons media" !important;
    }
    #proyectos .projects-grid > .card > .pdf-titlebar { grid-area: bar !important; }
    #proyectos .projects-grid > .card .featured-badge { grid-area: badge !important; }
    #proyectos .projects-grid > .card > h3 { grid-area: title !important; }
    #proyectos .projects-grid > .card .media-container { grid-area: media !important; align-self: center; margin-bottom: 0 !important; }
    #proyectos .projects-grid > .card .project-type { grid-area: type !important; }
    #proyectos .projects-grid > .card > p:not(.project-type) { grid-area: text !important; }
    #proyectos .projects-grid > .card .project-tags { grid-area: tags !important; align-self: start; align-content: flex-start; margin: 6px 0 18px !important; }
    #proyectos .projects-grid > .card .buttons { grid-area: buttons !important; align-self: start; margin-top: 0 !important; }
    }
    /* ---- Nada se sale de los bordes (PC y celular) ---- */
    html, body { overflow-x: hidden !important; max-width: 100% !important; }
    img, canvas, video { max-width: 100% !important; }
    .github-calendar-card img, .github-calendar-card svg { max-width: 100% !important; height: auto !important; }
    header > *, .card > *, .projects-grid > * { min-width: 0 !important; }
    h1, h2, h3, h4, p, li, a { overflow-wrap: anywhere; }
    header h1, .project-tags, .buttons, .tech-stack-general, .header-socials { flex-wrap: wrap !important; }

    /* ---- Barra rosa de ventana de cada proyecto (● ● ●  archivo.js ♡): se dibuja como elemento REAL con el mismo estilo que tu tech-style.css,
       porque html2canvas no dibuja bien el ::before ni los puntitos hechos con box-shadow.
       Ancho y márgenes se calculan en el clon según el padding real de cada tarjeta (celular y PC). ---- */
    #proyectos .card { position: relative !important; overflow: hidden !important; }
    #proyectos .card > .pdf-titlebar {
      display: flex !important; align-items: center !important; align-self: stretch !important; justify-self: stretch !important;
      position: relative !important; flex: none !important;
      box-sizing: border-box !important; height: 36px !important; min-height: 36px !important; max-width: none !important;
      padding: 0 16px 0 72px !important;
      font-family: var(--tk-mono, "JetBrains Mono", "SFMono-Regular", Consolas, monospace) !important;
      font-size: 11.5px !important; font-weight: 600 !important; line-height: 1 !important; white-space: nowrap !important;
      color: var(--tk-mut, #b07a98) !important;
      background-color: #fbcfe8 !important;
      background-image: var(--tk-bar, linear-gradient(135deg, #fff0f7, #fbcfe8)) !important;
      border-bottom: 1px solid var(--tk-line, rgba(236, 72, 153, 0.38)) !important;
      opacity: 1 !important; visibility: visible !important; z-index: 2 !important;
    }
    @media (max-width: 600px) {
      #proyectos .card > .pdf-titlebar { padding-left: 66px !important; }
    }
    #proyectos .card > .pdf-titlebar .pdf-dot { position: absolute !important; top: 13px !important; width: 10px !important; height: 10px !important; border-radius: 50% !important; display: block !important; }
    #proyectos .card > .pdf-titlebar .pdf-dot.d1 { left: 16px !important; background: var(--rosa-brillante, #ec4899) !important; }
    #proyectos .card > .pdf-titlebar .pdf-dot.d2 { left: 32px !important; background: var(--tk-dot2, #f9a8d4) !important; }
    #proyectos .card > .pdf-titlebar .pdf-dot.d3 { left: 48px !important; background: var(--tk-dot3, #fbcfe8) !important; }

    /* ---- Íconos Font Awesome convertidos a texto real (ver iconMap): se dibujan igual en PC y celular ---- */
    i.pdf-icon::before, i.pdf-icon::after { content: none !important; display: none !important; }
    i.pdf-icon { display: inline-block !important; font-style: normal !important; font-variant: normal !important; text-rendering: auto; -webkit-font-smoothing: antialiased; line-height: 1; width: auto; }
    /* ---- Sin recuadro / resaltado rosa en los íconos del header ---- */
    .header-socials, .header-socials * { -webkit-tap-highlight-color: transparent !important; outline: none !important; }
    .header-socials a, .header-socials a:hover, .header-socials a:focus { background: none !important; border: none !important; box-shadow: none !important; }

    #proyectos .project-group { display: block !important; }
    #proyectos .project-group .tech-title, #proyectos .project-group .group-sub { grid-column: auto !important; margin-left: 0; }
    #proyectos .project-group[data-group="react"] > .tech-title, #proyectos .project-group[data-group="react"] > .group-sub { display: block !important; }
  `;

  /* ---------- Exportar ---------- */
  // Barra de progreso en la ventana nueva (la animación usa transform → sigue fluida aunque la captura sea pesada)
  function progress(win, pct, text, secs) {
    if (curVh) { try { curVh.progress(pct, text); } catch (_) {} return; }
    try {
      if (!win || win.closed) return;
      const f = win.document.getElementById('fill');
      const st = win.document.getElementById('st');
      if (f) {
        f.style.transitionDuration = (secs || 1.2) + 's';
        f.style.transform = 'scaleX(' + pct + ')';
      }
      if (st && text) st.textContent = text;
    } catch (_) {}
  }

  const ICON_SEL = 'i[class*="fa-"], i.fa, i.fas, i.far, i.fab';
  const BLOCK_SEL = '.card, .github-calendar-card, .contact-grid, footer, p, li, h1, h2, h3, h4, img, .summary-pill, .tech-title, .group-sub';

  /* Capturas de los GIFs para el PDF: el primer cuadro de cada uno (antes de darle play),
     ya recortado al tamaño de la caja, igual que se hace con la foto de perfil.
     En el celular el "poster" a veces no llegó a cargarse (la descarga en segundo plano falla o no termina):
     en ese caso se descarga el GIF completo, se decodifica el primer cuadro y se usa ese. */
  // Celular / pantalla chica: ahí se usa el método nuevo para los GIFs. En PC todo queda como en el código original.
  const isMobileDevice = () => window.innerWidth < 800 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const fullGifCache = {};
  function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
  }
  // Devuelve algo dibujable en un canvas ({ src, w, h, close }) a partir del GIF completo
  async function decodeFullGif(url) {
    if (!url) return null;
    if (!fullGifCache[url]) {
      fullGifCache[url] = (async () => {
        const r = await fetchWithTimeout(url, 25000);
        if (!r.ok) throw new Error('fetch');
        return await r.blob();
      })().catch(() => null);
    }
    const blob = await fullGifCache[url];
    if (!blob) return null;
    try {
      if (window.createImageBitmap) {
        const bmp = await createImageBitmap(blob);
        return { src: bmp, w: bmp.width, h: bmp.height, close: () => { try { bmp.close(); } catch (_) {} } };
      }
    } catch (_) {}
    try {
      const u = URL.createObjectURL(blob);
      const im2 = new Image();
      await new Promise(res => { im2.onload = im2.onerror = res; im2.src = u; });
      if (im2.decode) { try { await im2.decode(); } catch (_) {} }
      URL.revokeObjectURL(u);
      if (im2.naturalWidth) return { src: im2, w: im2.naturalWidth, h: im2.naturalHeight, close: () => {} };
    } catch (_) {}
    return null;
  }

  async function gifPosterShots(fillColor) {
    const shots = [];
    try { if (window.prepareGifPostersForPrint) await window.prepareGifPostersForPrint(); } catch (_) {}
    const isMobile = isMobileDevice();
    const conts = Array.from(document.querySelectorAll('.media-container'));
    for (const c of conts) {
      let data = null;
      let fb = null;
      try {
        const im = c.querySelector('img.project-media');
        if (im) {
          // 1) el poster que ya tiene la página
          let ok = false;
          if (im.getAttribute('src')) {
            try { if (im.decode) await im.decode(); } catch (_) {}
            ok = im.naturalWidth > 0;
          }
          let drawable = null, nw = 0, nh = 0;
          if (ok) { drawable = im; nw = im.naturalWidth; nh = im.naturalHeight; }
          else {
            // 2) plan B: bajar el GIF completo y tomar su primer cuadro
            fb = await decodeFullGif(im.dataset.gif);
            if (fb) { drawable = fb.src; nw = fb.w; nh = fb.h; }
          }
          const r = c.getBoundingClientRect();
          const ratio = (r.width && r.height) ? r.width / r.height : 1873 / 862;
          const W = isMobile ? 2000 : 3000, H = Math.round(W / ratio);
          const cv2 = document.createElement('canvas');
          cv2.width = W; cv2.height = H;
          const ctx = cv2.getContext('2d');
          if (isMobile) { ctx.fillStyle = fillColor || '#ffffff'; ctx.fillRect(0, 0, W, H); }   // celular: GIFs con transparencia sobre el color de la tarjeta (claro/oscuro)
          if (drawable && nw) {
            const k = Math.max(W / nw, H / nh);
            const dw = nw * k, dh = nh * k;
            ctx.drawImage(drawable, (W - dw) / 2, (H - dh) / 2, dw, dh);
          } else {
            // 3) último recurso: que no quede el recuadro vacío (se muestra el nombre del proyecto)
            const g = ctx.createLinearGradient(0, 0, W, H);
            g.addColorStop(0, '#fbcfe8'); g.addColorStop(1, '#f9a8d4');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#9d174d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = '700 ' + Math.round(H / 8) + 'px system-ui, sans-serif';
            ctx.fillText((im.alt || '') + ' ✿', W / 2, H / 2);
          }
          data = cv2.toDataURL('image/jpeg', 0.98);
          cv2.width = cv2.height = 0;   // libera memoria (importante en iOS)
        }
      } catch (_) { data = null; }
      if (fb) fb.close();
      shots.push(data);
    }
    return shots;
  }

  // convierte cualquier color CSS (hex, rgb, nombre) a [r,g,b]
  function toRGB(c) {
    const x = document.createElement('canvas').getContext('2d');
    x.fillStyle = '#ffffff'; x.fillStyle = c;
    const h = x.fillStyle;
    if (h[0] === '#') { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    return (h.match(/\d+(\.\d+)?/g) || [255, 255, 255]).slice(0, 3).map(Number);
  }
  // Modo oscuro: data-theme / clase "dark"; si no hay ninguno, se deduce por la luminosidad real del fondo
  function isDarkTheme() {
    const de = document.documentElement, bd = document.body;
    const attr = de.getAttribute('data-theme') || bd.getAttribute('data-theme');
    if (attr) return /dark|oscuro/i.test(attr);
    if (de.classList.contains('dark') || bd.classList.contains('dark')) return true;
    const c = getComputedStyle(bd).backgroundColor;
    if (!c || /^rgba\(.*,\s*0\)$|^transparent$/.test(c)) return false;
    const [r, g, b] = toRGB(c);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 100;
  }

  async function exportPdf() {
    if (busy) return;
    busy = true; btn.disabled = true; updateTexts();

    // Precalentar el visor: mientras se genera el PDF se descargan (a la caché del navegador) las librerías que el visor
    // usa para mostrarlo, así cuando termina el "Generando PDF…" abre al toque en vez de esperar la descarga.
    try {
      const PB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
      fetch(PB + 'pdf.min.js').catch(() => {});
      fetch(PB + 'pdf.worker.min.js').catch(() => {});
    } catch (_) {}

    // Abrir la ventana YA (dentro del click) para que el navegador no la bloquee;
    // cuando el PDF esté listo se carga ahí.
    // Colores del tema actual (claro/oscuro): se leen de la propia página para que coincidan exactos
    const dark = isDarkTheme();
    const rs = getComputedStyle(document.documentElement), bsy = getComputedStyle(document.body);
    const cv = n => rs.getPropertyValue(n).trim();
    const solid = c => (c && !/^rgba\(.*,\s*0\)$|^transparent$/.test(c)) ? c : '';
    // Modo oscuro: colores fijos de tu portfolio (fondo casi negro, tarjetas ciruela oscuro y texto fucsia como el título).
    // Modo claro: se leen de la página.
    const C = dark ? {
      bg:     '#0f0a0d',
      ink:    '#f472b6',
      card:   '#2d1624',
      accent: cv('--rosa-brillante') || '#ec4899'
    } : {
      bg:     solid(bsy.backgroundColor) || solid(rs.backgroundColor) || '#ffd6e3',
      ink:    bsy.color || '#4a1d3d',
      card:   cv('--card-bg') || '#ffffff',
      accent: cv('--rosa-brillante') || '#ec4899'
    };

    // Si el portfolio tiene el visor (DocViewer) se usa ese; si no, queda la ventana nueva de siempre
    curVh = (window.DocViewer && window.DocViewer.beginExport) ? window.DocViewer.beginExport({ dark: dark, theme: dark ? 'dark' : 'light', lang: lang(), file: T[lang()].file, title: T[lang()].doc }) : null;
    let win = null;
    try {
      win = curVh ? null : window.open('', '_blank');
      if (win) {
        win.document.write(
          '<!doctype html><html lang="' + lang() + '" style="color-scheme:' + (dark ? 'dark' : 'light') + '"><meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<title>' + T[lang()].doc + '</title>' +
          '<style>' +
          '*{box-sizing:border-box}' +
          'body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;' +
          'background:' + C.bg + ';color:' + C.ink + ';font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:24px;text-align:center}' +
          '.flor{font-size:54px;line-height:1;color:' + C.accent + ';animation:g 3s linear infinite}' +
          '@keyframes g{to{transform:rotate(360deg)}}' +
          'h1{margin:0;font-size:22px;font-weight:800}' +
          '.track{width:min(420px,86vw);height:18px;border-radius:999px;background:' + C.card + ';border:2px solid ' + C.accent + ';overflow:hidden;' +
          'box-shadow:0 6px 18px rgba(236,72,153,' + (dark ? '.35' : '.25') + ')}' +
          '.fill{height:100%;width:100%;border-radius:999px;transform-origin:left center;transform:scaleX(.04);' +
          'background:linear-gradient(90deg,#f9a8d4,' + C.accent + ',#f9a8d4);background-size:200% 100%;' +
          'transition:transform 1.2s cubic-bezier(.22,.8,.3,1);animation:s 1.4s linear infinite}' +
          '@keyframes s{to{background-position:-200% 0}}' +
          '#st{font-size:15px;font-weight:600;opacity:.8}' +
          '</style>' +
          '<body><div class="flor">✿</div><h1>' + T[lang()].wait + '</h1>' +
          '<div class="track"><div class="fill" id="fill"></div></div>' +
          '<div id="st">' + T[lang()].s1 + '</div></body></html>');
        win.document.close();
      }
    } catch (_) { win = null; }

    // Sube la página arriba de todo antes de capturar
    window.scrollTo({ top: 0, behavior: 'instant' });

    try {
      progress(win, 0.12, T[lang()].s1, 1);
      await ensureLibs();
      progress(win, 0.3, T[lang()].s2, 1.2);

      // cargar imágenes lazy antes de capturar
      const imgs = Array.from(document.querySelectorAll('img'));
      imgs.forEach(i => { i.loading = 'eager'; });
      await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));

      const gifShots = await gifPosterShots(C.card);

      progress(win, 0.45, T[lang()].s3, 6);
      await new Promise(r => setTimeout(r, 60)); // deja pintar la barra antes de la captura pesada
      const bg = solid(getComputedStyle(document.body).backgroundColor) || solid(getComputedStyle(document.documentElement).backgroundColor) || C.bg;

      // Íconos Font Awesome: html2canvas los dibuja con el ::before, que a veces no llega al clon (sobre todo en celular).
      // Se lee el glifo real de la página y se escribe como texto dentro del <i> del clon.
      try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
      const iconMap = {};
      document.querySelectorAll(ICON_SEL).forEach((el, n) => {
        try {
          if (el.children.length || (el.textContent || '').trim()) return;
          const cs = getComputedStyle(el, '::before');
          let g = cs.content;
          if (!g || g === 'none' || g === 'normal') return;
          g = g.replace(/^["']|["']$/g, '').replace(/\\([0-9a-f]{1,6})\s?/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)));
          if (!g) return;
          el.setAttribute('data-pdf-ic', n);
          iconMap[n] = { g: g, f: cs.fontFamily, w: cs.fontWeight };
        } catch (_) {}
      });
      try {
        const seen = {};
        await Promise.all(Object.values(iconMap).map(d => {
          const k = d.w + d.f; if (seen[k] || !document.fonts || !document.fonts.load) return null;
          seen[k] = 1; return document.fonts.load(d.w + ' 28px ' + d.f, d.g).catch(() => {});
        }));
      } catch (_) {}

      const container = document.querySelector('.container');
      const links = [];
      const blocks = []; // bloques que no conviene cortar entre páginas
      const gifSlots = []; // recuadros de GIFs (solo celular)
      const mobileGifs = isMobileDevice();
      // Ancho de captura: PC 1000 (layout de escritorio). Celular 560 → se aplica el diseño responsive de celular
      // (tarjetas de a una, texto grande y legible al abrir el PDF en el teléfono).
      const VW = mobileGifs ? 560 : 1000;   // celular 560 (el visor lo muestra entero, sin recortar) · PC 1000
      let pageW = VW, totalH = 0, measuredBase = null;

      // Calidad: en vez de UNA captura gigante (que el navegador obliga a achicar y queda borrosa),
      // cada página del PDF se captura por separado a alta resolución.
      // Calidad: PC 4x, celular 3.5x. Por página se limita el área del canvas para que el navegador no la achique ni falle
      // (Safari / iPhone aguantan menos píxeles que Chrome / Firefox).
      const HI = mobileGifs ? 3.5 : 3;   // PC 3x: sigue nítido y pesa casi la mitad → se genera y se abre mucho más rápido
      const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
      const MAX_AREA = (isSafari || mobileGifs) ? 16e6 : 50e6;
      // Respaldo (por si la captura por páginas falla): una sola captura como antes
      const approxH = container.scrollHeight + 100;
      const fallbackScale = Math.max(1, Math.min(2, Math.sqrt(16e6 / (VW * approxH))));

      // Foto de perfil: se recorta (cover + centrada) en un canvas cuadrado ANTES de capturar.
      // Es un <img> (con la misma foto de fondo en el CSS): se usa el propio src del <img> si existe,
      // y si no, la imagen de fondo. Así en el PDF siempre es un círculo perfecto, sin estirarse.
      let fotoData = null;
      try {
        const fotoEl = document.querySelector('.foto-perfil');
        let fotoSrc = '';
        if (fotoEl && fotoEl.tagName === 'IMG') fotoSrc = fotoEl.currentSrc || fotoEl.src || '';
        if (!fotoSrc && fotoEl) {
          const m = /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(fotoEl).backgroundImage);
          if (m) fotoSrc = m[1];
        }
        if (fotoSrc) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise(r => { img.onload = img.onerror = r; img.src = fotoSrc; });
          if (img.naturalWidth) {
            const S = 800, cv = document.createElement('canvas');
            cv.width = cv.height = S;
            const k = Math.max(S / img.naturalWidth, S / img.naturalHeight);
            const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
            const fctx = cv.getContext('2d');
            fctx.imageSmoothingQuality = 'high';
            fctx.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh);
            fotoData = cv.toDataURL('image/jpeg', 0.95);
          }
        }
      } catch (_) { fotoData = null; }

      // Nombre de archivo de la barra de cada proyecto (ej. "cuota-nube.js  ♡"), leído de la web real
      const barTitles = {};
      try {
        document.querySelectorAll('#proyectos .card[data-project]').forEach(c => {
          const t = getComputedStyle(c, '::before').content;
          if (t && t !== 'none' && t !== 'normal') barTitles[c.getAttribute('data-project')] = t.replace(/^["']|["']$/g, '');
        });
      } catch (_) {}

      // Opciones de captura. measure=true → además mide bloques, links y recuadros de GIFs (una sola vez, en la pasada rápida)
      const cloneOpts = measure => ({
        backgroundColor: bg, useCORS: true, logging: false, windowWidth: VW,
        ignoreElements: n => {
          if (!n || n.nodeType !== 1) return false;
          const cls = typeof n.className === 'string' ? n.className : '';
          return n.hasAttribute('data-pdf-ignore') || /(^|[-_\s])doc-?viewer/i.test((n.id || '') + ' ' + cls);
        },
        onclone: (doc, el) => {
          const st = doc.createElement('style'); st.textContent = HIDE_CSS; doc.head.appendChild(st);
          doc.querySelectorAll('[data-pdf-ic]').forEach(el => {
            const d = iconMap[el.getAttribute('data-pdf-ic')]; if (!d) return;
            el.textContent = d.g; el.classList.add('pdf-icon');
            el.style.setProperty('font-family', d.f, 'important');
            el.style.setProperty('font-weight', d.w, 'important');
          });
          // mostrar TODOS los proyectos (el filtro de la página deja solo "Destacados" y oculta los demás grupos)
          doc.querySelectorAll('.project-group.hide-card, .card.hide-card').forEach(c => c.classList.remove('hide-card'));
          // el formato ancho (un proyecto por fila) depende del filtro "Destacados": se fija en el clon, sin tocar la página real
          doc.querySelectorAll('.project-filters .filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'featured'));

          // Versión "limpia": se quitan adornos que html2canvas podía dibujar como manchas
          if (!KEEP_DETAILS) {
            doc.querySelectorAll('#contacto .contact-item > [class*="pseudoelement_after"], section > h2 > [class*="pseudoelement_after"], .tk-status [class*="pseudoelement"]').forEach(n => n.remove());
            doc.querySelectorAll('#contacto .contact-item *').forEach(n => {
              if (n.children.length) return;
              if (/^\s*(mailto|\/in|git)\s*$/i.test(n.textContent || '')) n.remove();
            });
            doc.querySelectorAll('#contacto .contact-item [class*="pseudoelement"]').forEach(n => n.remove());
          }

          // quitar formulario de consultas + desplegable del clon
          markFormBlocks(doc);
          doc.querySelectorAll('[data-pdf-hide]').forEach(n => n.remove());

          // Contacto: sin la mancha rosa (etiquetas mailto / /in / git y pseudo-elementos de los botones), en PC y en celular
          if (!KEEP_DETAILS) doc.querySelectorAll('#contacto .contact-item').forEach(a => {
            Array.from(a.querySelectorAll('*')).forEach(n => {
              if (n.closest('i.pdf-icon')) return;
              if (n.children.length) return;
              const isPseudo = n.tagName && n.tagName.toLowerCase() === 'html2canvaspseudoelement';
              if (isPseudo || /^\s*(mailto|\/in|git|⌘\s*c)\s*$/i.test(n.textContent || '')) n.remove();
            });
          });

          // GIFs
          doc.querySelectorAll('.media-container').forEach((c, i) => {
            const im = c.querySelector('img.project-media');
            const cvs = c.querySelector('canvas.project-media');
            if (cvs) cvs.remove();
            c.querySelectorAll('.gif-zoom-btn, .gif-toggle-btn').forEach(b => b.remove());
            if (mobileGifs) {
              // Celular: se deja el recuadro vacío y se anota dónde está; la imagen se pinta después sobre la captura
              // (en iPhone html2canvas no dibujaba estas imágenes)
              if (im) { im.removeAttribute('srcset'); im.removeAttribute('src'); im.style.visibility = 'hidden'; }
              if (measure) gifSlots.push({ i, node: c });
            } else if (im && gifShots[i]) {
              // PC: igual que el código original (primer cuadro ya recortado dentro de la captura)
              im.removeAttribute('srcset');
              im.src = gifShots[i];
              im.style.cssText += ';object-fit:fill;width:100%;height:100%;';
            }
          });

          // foto de perfil ya recortada: cuadrada y circular, sin "cover" que recalcular.
          // Si es un <img>, se reemplaza su src por el recorte cuadrado (así no se estira en el celular).
          const fp = doc.querySelector('.foto-perfil');
          if (fp && fotoData) {
            if (fp.tagName === 'IMG') {
              fp.removeAttribute('srcset'); fp.removeAttribute('loading');
              fp.src = fotoData;
              fp.style.cssText += ';object-fit:cover;object-position:center;background:none !important;';
            } else {
              fp.style.cssText += ';background-image:url("' + fotoData + '") !important;' +
                'background-size:100% 100% !important;background-position:0 0 !important;background-repeat:no-repeat !important;';
            }
            fp.style.cssText += ';width:180px;height:180px;';
          }

          doc.documentElement.classList.add('pdf-capture');   // las reglas de celular de la web NO se aplican al PDF
          doc.documentElement.style.background = bg; doc.body.style.background = bg;
          // Barra rosa de ventana real en TODOS los proyectos: se toma el nombre del archivo del ::before (que html2canvas
          // convirtió en <html2canvaspseudoelement>) y se reemplazan los pseudo-elementos por elementos de verdad.
          // El ancho y los márgenes salen del padding REAL de cada tarjeta, así la barra cubre todo el ancho también en celular.
          const view = doc.defaultView;
          doc.querySelectorAll('#proyectos .card').forEach(card => {
            let title = '';
            Array.from(card.children).forEach(ch => {
              if (ch.tagName && ch.tagName.toLowerCase() === 'html2canvaspseudoelement') {
                if (!title && (ch.textContent || '').trim()) title = ch.textContent.trim();
                ch.remove();
              }
            });
            if (!title) title = barTitles[card.getAttribute('data-project')] || ((card.getAttribute('data-project') || 'proyecto') + '  \u2661');
            Array.from(card.children).forEach(ch => { if (ch.classList && ch.classList.contains('pdf-titlebar')) ch.remove(); });
            const bar = doc.createElement('div'); bar.className = 'pdf-titlebar';
            ['d1', 'd2', 'd3'].forEach(k => { const d = doc.createElement('span'); d.className = 'pdf-dot ' + k; bar.appendChild(d); });
            const tt = doc.createElement('span'); tt.textContent = title; bar.appendChild(tt);
            card.insertBefore(bar, card.firstChild);
            try {
              const cs = view.getComputedStyle(card);
              const pt = parseFloat(cs.paddingTop) || 0, pr = parseFloat(cs.paddingRight) || 0, pl = parseFloat(cs.paddingLeft) || 0;
              bar.style.setProperty('margin-top', (-pt) + 'px', 'important');
              bar.style.setProperty('margin-left', (-pl) + 'px', 'important');
              bar.style.setProperty('margin-right', (-pr) + 'px', 'important');
              bar.style.setProperty('margin-bottom', '20px', 'important');
              bar.style.setProperty('width', 'calc(100% + ' + (pl + pr) + 'px)', 'important');
            } catch (_) {
              bar.style.setProperty('margin', 'calc(var(--cp, 24px) * -1) calc(var(--cp, 24px) * -1) 20px', 'important');
              bar.style.setProperty('width', 'calc(100% + var(--cp, 24px) * 2)', 'important');
            }
          });

          el.style.cssText += ';width:' + VW + 'px;max-width:none;margin:0;padding:' + (mobileGifs ? '32px 22px' : '48px 40px') + ';background:' + bg + ';';
          if (!measure) return;
          const base = el.getBoundingClientRect();
          pageW = Math.ceil(base.width); totalH = Math.ceil(base.height);
          measuredBase = base;
          // bloques "indivisibles": tarjetas, párrafos, títulos, etc. (posiciones relativas al contenedor)
          el.querySelectorAll(BLOCK_SEL).forEach(b => {
            const r = b.getBoundingClientRect();
            if (r.height < 2) return;
            const isHead = /^H[1-4]$/.test(b.tagName) && !b.closest('.card');
            // un título se queda pegado a lo que sigue (no queda solo al final de una página)
            blocks.push({ top: r.top - base.top, rawBottom: r.bottom - base.top, bottom: r.bottom - base.top + (isHead ? 110 : 0) });
          });
          // El pie ("Desarrollado por…") queda siempre pegado a Contacto: nunca puede ir solo en otra hoja
          const ctS = el.querySelector('#contacto'), ftS = el.querySelector('footer');
          if (ctS && ftS) {
            const rc = ctS.getBoundingClientRect(), rf = ftS.getBoundingClientRect();
            if (rf.bottom > rc.top) blocks.push({ top: rc.top - base.top, rawBottom: rf.bottom - base.top, bottom: rf.bottom - base.top });
          }
          gifSlots.forEach(g => {
            const r = g.node.getBoundingClientRect();
            g.x = r.left - base.left; g.y = r.top - base.top; g.w = r.width; g.h = r.height; g.node = null;
          });
          el.querySelectorAll('a[href]').forEach(a => {
            const href = a.href;
            if (!/^(https?:|mailto:)/.test(href) || href === doc.location.href + '#') return;
            Array.from(a.getClientRects()).forEach(r => {
              if (r.width > 1 && r.height > 1) links.push({ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height, url: href });
            });
          });
        }
      });

      // Pasada rápida (canvas diminuto): solo para medir el layout y decidir dónde se corta cada página
      await window.html2canvas(container, Object.assign({ scale: 0.2 }, cloneOpts(true)));
      if (!totalH) throw new Error('No se pudo medir el portfolio');
      // el PDF termina justo debajo del último bloque ("Desarrollado por…"), sin colchón en blanco
      if (blocks.length) totalH = Math.min(totalH, Math.ceil(Math.max(...blocks.map(b => b.rawBottom)) + 36));

      progress(win, 0.55, T[lang()].s3, 5);
      const w = pageW || VW;

      // ---- Paginado tipo A4 (vertical), cortando en espacios libres y no por la mitad de una tarjeta ----
      const pageH = Math.round(w * (mobileGifs ? 2.2 : 1.4142));   // PC: A4 · celular: hoja más alta para que cada tarjeta entre entera
      const M = 28;                           // margen arriba y abajo de cada página
      const usable = pageH - M * 2;
      const pages = [];
      // Zonas "indivisibles" (tarjetas, párrafos, títulos pegados a lo que sigue). Un corte solo puede ir ENTRE zonas.
      const gapsOf = useExt => {
        const iv = blocks.filter(b => (b.rawBottom - b.top) <= usable)
          .map(b => [b.top, useExt ? b.bottom : b.rawBottom]).sort((x, y) => x[0] - y[0]);
        const m = [];
        for (const [t, bt] of iv) {
          const l = m[m.length - 1];
          if (l && t < l[1]) l[1] = Math.max(l[1], bt); else m.push([t, bt]);
        }
        const g = [];
        for (let i = 0; i < m.length - 1; i++) g.push(Math.max(m[i][1], m[i + 1][0] - 3));
        return g;
      };
      const gE = gapsOf(true), gR = gapsOf(false);
      // el corte más tardío posible dentro de la hoja => la hoja se llena al máximo
      const pick = (g, lo, hi) => { let best = 0; for (const y of g) if (y > lo && y <= hi) best = y; return best; };
      let y0 = 0;
      while (y0 < totalH - 1) {
        const limit = y0 + usable;
        if (limit >= totalH) { pages.push([y0, totalH]); break; }
        const end = pick(gE, y0 + usable * 0.35, limit) || pick(gR, y0 + usable * 0.2, limit) || limit;
        pages.push([y0, end]);
        y0 = end;
      }
      // Última hoja casi vacía: se une a la anterior (cada hoja mide lo que mide su contenido, no queda espacio muerto)
      if (pages.length > 1) {
        const last = pages[pages.length - 1], prev = pages[pages.length - 2];
        if (!UNIFORM_PAGES && (last[1] - last[0]) < usable * 0.45 && (last[1] - prev[0]) <= usable * 1.5) {
          prev[1] = last[1]; pages.pop();
        }
      }
      const pageHeight = ([a0, a1]) => UNIFORM_PAGES ? pageH : Math.ceil(a1 - a0) + M * 2;

      const [br, bgc, bb] = toRGB(bg);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: [w, pageHeight(pages[0])], hotfixes: ['px_scaling'] });

      // Pinta los primeros cuadros de los GIFs sobre la captura de UNA página (solo celular; de a uno para cuidar la memoria en iOS)
      async function paintGifs(cv, sc, a0, a1) {
        const ctx = cv.getContext('2d');
        // html2canvas deja su escala/desplazamiento aplicados en el canvas: se reinician para dibujar en píxeles reales
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const rr = (x, y, ww, hh, r) => {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + ww, y, x + ww, y + hh, r);
          ctx.arcTo(x + ww, y + hh, x, y + hh, r);
          ctx.arcTo(x, y + hh, x, y, r);
          ctx.arcTo(x, y, x + ww, y, r);
          ctx.closePath();
        };
        for (const g of gifSlots) {
          if (!(g.w > 0) || !(g.h > 0)) continue;
          if (g.y + g.h < a0 || g.y > a1) continue;   // no toca esta página
          const data = gifShots[g.i];
          const gx = g.x * sc, gy = (g.y - a0) * sc, gw = g.w * sc, gh = g.h * sc;
          // fondo rosa debajo: si la imagen llega a dibujarse lo tapa por completo; si no, el recuadro no queda en blanco
          ctx.save();
          rr(gx, gy, gw, gh, 12 * sc);
          ctx.clip();
          const gr = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
          gr.addColorStop(0, '#fbcfe8'); gr.addColorStop(1, '#f9a8d4');
          ctx.fillStyle = gr;
          ctx.fillRect(gx, gy, gw, gh);
          ctx.restore();
          if (!data) continue;
          try {
            const im = new Image();
            await new Promise(res => { im.onload = im.onerror = res; im.src = data; });
            if (im.decode) { try { await im.decode(); } catch (_) {} }
            if (!im.naturalWidth) continue;
            ctx.save();
            rr(gx, gy, gw, gh, 12 * sc);
            ctx.clip();
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(im, gx, gy, gw, gh);
            ctx.restore();
            im.src = '';
          } catch (_) {}
        }
      }

      // Captura de una página: alta resolución; si algo falla, cae en la captura única de antes
      let fullCanvas = null, hiOk = true;
      async function renderPage(a0, a1) {
        const h = Math.max(1, Math.ceil(a1 - a0));
        if (hiOk) {
          try {
            const scPage = Math.max(1.5, Math.min(HI, Math.sqrt(MAX_AREA / (w * h))));
            const cv = await window.html2canvas(container, Object.assign({ scale: scPage, x: 0, y: a0, width: w, height: h }, cloneOpts(false)));
            if (cv && cv.width > 0 && cv.height > 0) return { cv, sc: scPage };
          } catch (e) { console.warn('Captura por páginas falló, uso el método anterior', e); }
          hiOk = false;
        }
        if (!fullCanvas) fullCanvas = await window.html2canvas(container, Object.assign({ scale: fallbackScale }, cloneOpts(false)));
        const sy = Math.round(a0 * fallbackScale);
        const sh = Math.max(1, Math.min(fullCanvas.height - sy, Math.round((a1 - a0) * fallbackScale)));
        const part = document.createElement('canvas');
        part.width = fullCanvas.width; part.height = sh;
        const pctx = part.getContext('2d');
        pctx.fillStyle = bg; pctx.fillRect(0, 0, part.width, part.height);
        pctx.drawImage(fullCanvas, 0, sy, fullCanvas.width, sh, 0, 0, fullCanvas.width, sh);
        return { cv: part, sc: fallbackScale };
      }

      for (let i = 0; i < pages.length; i++) {
        const [a0, a1] = pages[i];
        progress(win, 0.55 + 0.4 * (i / pages.length), T[lang()].s3, 4);
        const { cv, sc } = await renderPage(a0, a1);
        if (mobileGifs) await paintGifs(cv, sc, a0, a1);
        const ph = pageHeight(pages[i]);
        if (i > 0) pdf.addPage([w, ph], 'p');
        pdf.setFillColor(br, bgc, bb);
        pdf.rect(0, 0, w, ph, 'F');
        pdf.addImage(cv.toDataURL('image/jpeg', mobileGifs ? 0.98 : 0.92), 'JPEG', 0, M, w, Math.ceil(a1 - a0), undefined, 'NONE');
        cv.width = cv.height = 0; // libera memoria
        await new Promise(r => setTimeout(r, 0));
      }
      if (fullCanvas) { fullCanvas.width = fullCanvas.height = 0; fullCanvas = null; }
      progress(win, 0.96, T[lang()].s4, 2);

      // links clickeables, ubicados en la página que les corresponde
      links.forEach(l => {
        pages.forEach(([a0, a1], i) => {
          const top = Math.max(l.y, a0), bot = Math.min(l.y + l.h, a1);
          if (bot - top > 1) { pdf.setPage(i + 1); pdf.link(l.x, M + top - a0, l.w, bot - top, { url: l.url }); }
        });
      });
      pdf.setPage(1);
      pdf.setProperties({ title: T[lang()].doc, author: 'Florencia Bagnis' });

      if (curVh) {
        // PDF listo: se muestra en el visor del portfolio (Descargar / Volver)
        progress(null, 1, T[lang()].s5, 0.4);
        await new Promise(r => setTimeout(r, 400));
        // si el visor falla al mostrarlo, se descarga directo (nunca se pierde el PDF)
        try { curVh.done(pdf.output('blob')); }
        catch (err) { console.warn('El visor no pudo mostrar el PDF, se descarga directo', err); pdf.save(T[lang()].file); }
      } else if (win && !win.closed) {
        // Abrir el PDF ya generado en la otra ventana (ahí se puede ver y descargar)
        if (lastUrl) URL.revokeObjectURL(lastUrl);
        lastUrl = URL.createObjectURL(pdf.output('blob'));
        progress(win, 1, T[lang()].s5, 0.4);
        await new Promise(r => setTimeout(r, 600));
        win.location.href = lastUrl;
      } else {
        // Si el navegador bloqueó la ventana: descarga directa como antes
        pdf.save(T[lang()].file);
      }
      status = lang() === 'en' ? 'Done! ✿' : '¡Listo! ✿';
      setTimeout(() => { status = ''; updateTexts(); }, 2500);
    } catch (e) {
      console.error(e);
      if (curVh) { try { curVh.fail(); } catch (_) {} }
      else { if (win && !win.closed) win.close(); alert(T[lang()].err); }
    } finally {
      document.querySelectorAll('[data-pdf-ic]').forEach(e => e.removeAttribute('data-pdf-ic'));
      curVh = null; busy = false; btn.disabled = false; updateTexts();
    }
  }
  btn.addEventListener('click', exportPdf);
})();
