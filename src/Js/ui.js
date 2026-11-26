/**
 * Manipulación segura del DOM contra XSS (createElement, textContent),
 * cadena de fallback de imágenes en 3 etapas, mapeo de errores a inputs
 * (aria-invalid="true"), gráfica SVG de líneas y eventos sin tarjetas.
 */
import { CONFIG } from './config.js';
import { resolveAssetUrl } from './api.js';
import { isAuthenticated } from './session.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function buildSvgDataUri(title = 'SazónYA Grill') {
  const safeText = String(title)
    .replace(/[&<>"']/g, '')
    .slice(0, 26);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1D1E22"/>
        <stop offset="100%" stop-color="#E63946"/>
      </linearGradient>
    </defs>
    <rect width="640" height="420" fill="url(#bg)"/>
    <circle cx="320" cy="180" r="78" fill="#FFB703" opacity="0.22"/>
    <path d="M245 180 Q320 120 395 180 Z" fill="#FFB703"/>
    <rect x="240" y="190" width="160" height="18" rx="9" fill="#2A9D8F"/>
    <rect x="245" y="216" width="150" height="22" rx="10" fill="#FB8500"/>
    <text x="320" y="315" text-anchor="middle" fill="#FFFDF9" font-family="Poppins, sans-serif" font-size="24" font-weight="700">${safeText}</text>
    <text x="320" y="348" text-anchor="middle" fill="#FFB703" font-family="Inter, sans-serif" font-size="14">SazónYA · Comida Rápida a la Brasa</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function attachImageFallback(imgElement, productName = 'SazónYA') {
  if (!imgElement) return;
  imgElement.addEventListener('error', () => {
    if (String(imgElement.src || '').startsWith('data:image/svg+xml')) return;
    const stage = Number(imgElement.dataset.fallbackStage || 0);
    if (stage === 0) {
      imgElement.dataset.fallbackStage = '1';
      const seed = encodeURIComponent(String(productName || 'sazonya').toLowerCase().replace(/\s+/g, '-'));
      imgElement.src = `https://picsum.photos/seed/${seed}/640/420`;
    } else if (stage === 1) {
      imgElement.dataset.fallbackStage = '2';
      imgElement.src = buildSvgDataUri(productName);
    }
  });
}

export function formatCurrency(value) {
  const num = Number(value || 0);
  return `$${num.toFixed(2)}`;
}

/**
 * Helper de creación segura de elementos DOM (Cero innerHTML con datos de usuario -> Prevención XSS)
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (val === undefined || val === null || val === false) continue;
    if (key === 'className') {
      node.className = val;
    } else if (key === 'textContent') {
      node.textContent = String(val);
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(node.style, val);
    } else if (key.startsWith('on') && typeof val === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key === 'dataset' && typeof val === 'object') {
      Object.assign(node.dataset, val);
    } else {
      node.setAttribute(key, String(val));
    }
  }

  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      node.appendChild(child);
    }
  }
  return node;
}

export function clearContainer(container) {
  if (!container) return;
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animación en JavaScript puro (Web Animations API + requestAnimationFrame)
 * Aplica aparición escalonada (stagger reveal) a tarjetas y paneles.
 */
export function animateStaggerCards(container, selector = '.card') {
  if (!container || prefersReducedMotion()) return;
  const elements = Array.from(container.querySelectorAll(selector));
  elements.forEach((card, index) => {
    if (typeof card.animate === 'function') {
      card.animate(
        [
          { opacity: 0, transform: 'translateY(18px) scale(0.985)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' }
        ],
        {
          duration: 380,
          delay: Math.min(index * 55, 350),
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'both'
        }
      );
    }
  });
}

/**
 * Animación de pulso en JavaScript al actualizar carrito, favoritos o estrellas
 */
export function animatePulse(element) {
  if (!element || prefersReducedMotion() || typeof element.animate !== 'function') return;
  element.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.08)' },
      { transform: 'scale(1)' }
    ],
    {
      duration: 280,
      easing: 'ease-out'
    }
  );
}

/**
 * Animación de contador numérico en un único bucle requestAnimationFrame (60 FPS)
 */
export function animateCounter(element, targetValue, { prefix = '', suffix = '', decimals = 0, duration = 650 } = {}) {
  if (!element) return;
  const finalNum = Number(targetValue || 0);
  if (prefersReducedMotion()) {
    element.textContent = `${prefix}${finalNum.toFixed(decimals)}${suffix}`;
    return;
  }

  const startTime = performance.now();
  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = finalNum * eased;
    element.textContent = `${prefix}${current.toFixed(decimals)}${suffix}`;
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }
  requestAnimationFrame(tick);
}

/**
 * Notificación accesible (role="status", aria-live="polite") animada por JS
 */
export function showNotification(message, type = 'success') {
  const host = document.getElementById('notification-host');
  if (!host) return;
  clearContainer(host);

  const closeBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-outline',
      style: { padding: '0.2rem 0.6rem', fontSize: '0.8rem' },
      onClick: () => clearContainer(host)
    },
    'Cerrar'
  );

  const banner = el(
    'div',
    {
      className: `status-banner ${type}`,
      role: 'status',
      'aria-live': 'polite'
    },
    [el('span', { textContent: message }), closeBtn]
  );

  host.appendChild(banner);
  if (!prefersReducedMotion() && typeof banner.animate === 'function') {
    banner.animate(
      [
        { opacity: 0, transform: 'translateY(-10px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      { duration: 240, easing: 'ease-out' }
    );
  }
}

/**
 * Mapeo automático de errores por campo a inputs (aria-invalid="true")
 */
export function applyFormErrors(formElement, errors = []) {
  if (!formElement) return;
  for (const input of formElement.querySelectorAll('[aria-invalid]')) {
    input.setAttribute('aria-invalid', 'false');
  }
  for (const errNode of formElement.querySelectorAll('.field-error')) {
    errNode.textContent = '';
  }

  for (const err of errors) {
    if (!err.field) continue;
    const safeField = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(err.field) : err.field;
    const input = formElement.querySelector(`[name="${safeField}"]`);
    if (input) {
      input.setAttribute('aria-invalid', 'true');
    }
    const msgNode = formElement.querySelector(`[data-error-for="${safeField}"]`);
    if (msgNode) {
      msgNode.textContent = err.message;
    }
  }
}

/* ==========================================================================
   GRÁFICO DE LÍNEAS SVG (Paleta Oficial «Sazón & Brasa»)
   ========================================================================== */
export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatShortChartLabel(rawDate) {
  const str = String(rawDate || '').trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}`;
  }
  return str.length > 12 ? `${str.slice(0, 11)}…` : str;
}

function toFiniteNonNeg(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function niceAxisCeiling(maxVal, minBase = 10) {
  const safeMax = toFiniteNonNeg(maxVal);
  const base = Math.max(toFiniteNonNeg(minBase), safeMax);
  const raw = base * 1.15;
  if (!Number.isFinite(raw)) return safeMax;
  if (raw <= 10) return Math.ceil(raw);
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = magnitude / 2;
  const result = Math.ceil(raw / step) * step;
  return Number.isFinite(result) ? result : safeMax;
}

export function buildWeeklyLineChartModel(
  stats = {},
  { width = 760, height = 300, padLeft = 58, padRight = 54, padTop = 24, padBottom = 46 } = {}
) {
  let source = 'empty';
  let rawPoints = [];

  if (Array.isArray(stats?.serie_diaria) && stats.serie_diaria.length > 0) {
    source = 'serie_diaria';
    rawPoints = stats.serie_diaria.map((d) => ({
      label: formatShortChartLabel(d?.fecha),
      fullLabel: String(d?.fecha || ''),
      ingresos: toFiniteNonNeg(d?.ingresos),
      ganancia_neta: toFiniteNonNeg(d?.ganancia_neta),
      unidades: toFiniteNonNeg(d?.unidades),
      pedidos: toFiniteNonNeg(d?.pedidos)
    }));
  } else if (
    Array.isArray(stats?.ganancias_por_producto) &&
    stats.ganancias_por_producto.some((p) => toFiniteNonNeg(p?.unidades_vendidas) > 0 || toFiniteNonNeg(p?.ingresos_totales) > 0)
  ) {
    source = 'ganancias_por_producto';
    rawPoints = [...stats.ganancias_por_producto]
      .sort((a, b) => toFiniteNonNeg(b?.ingresos_totales) - toFiniteNonNeg(a?.ingresos_totales))
      .slice(0, 7)
      .map((p) => ({
        label: formatShortChartLabel(p?.producto_nombre),
        fullLabel: String(p?.producto_nombre || 'Producto'),
        ingresos: toFiniteNonNeg(p?.ingresos_totales),
        ganancia_neta: toFiniteNonNeg(p?.ganancia_neta),
        unidades: toFiniteNonNeg(p?.unidades_vendidas),
        pedidos: 0
      }));
  }

  const plotW = Math.max(100, width - padLeft - padRight);
  const plotH = Math.max(80, height - padTop - padBottom);

  if (rawPoints.length === 0) {
    return {
      source: 'empty',
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      plotW,
      plotH,
      maxMoney: 10,
      maxUnits: 5,
      points: []
    };
  }

  const maxMoney = niceAxisCeiling(
    Math.max(...rawPoints.flatMap((p) => [p.ingresos, p.ganancia_neta])),
    10
  );
  const maxUnits = niceAxisCeiling(Math.max(...rawPoints.map((p) => p.unidades)), 5);

  const count = rawPoints.length;
  const points = rawPoints.map((p, idx) => {
    const x = count === 1 ? padLeft + plotW / 2 : padLeft + (idx / (count - 1)) * plotW;
    const yIngresos = padTop + plotH - (p.ingresos / maxMoney) * plotH;
    const yGanancia = padTop + plotH - (p.ganancia_neta / maxMoney) * plotH;
    const yUnidades = padTop + plotH - (p.unidades / maxUnits) * plotH;
    return {
      ...p,
      index: idx,
      x: Number(x.toFixed(2)),
      yIngresos: Number(yIngresos.toFixed(2)),
      yGanancia: Number(yGanancia.toFixed(2)),
      yUnidades: Number(yUnidades.toFixed(2))
    };
  });

  return {
    source,
    width,
    height,
    padLeft,
    padRight,
    padTop,
    padBottom,
    plotW,
    plotH,
    maxMoney,
    maxUnits,
    points
  };
}

export function buildWeeklyLineChartMarkup(stats = {}, options = {}) {
  const model = buildWeeklyLineChartModel(stats, options);
  const { width, height, padLeft, padRight, padTop, plotW, plotH, maxMoney, maxUnits, points } = model;
  const baselineY = padTop + plotH;

  if (points.length === 0) {
    return `<svg class="weekly-line-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Sin datos semanales disponibles"><title>Tendencia semanal</title><rect x="0" y="0" width="${width}" height="${height}" fill="#FFFDF9" rx="10"/><text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#5A5D65" font-size="14" font-family="Inter, sans-serif">Aún no hay ventas registradas para graficar.</text></svg>`;
  }

  const gridLines = [];
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const ratio = i / ticks;
    const y = Number((baselineY - ratio * plotH).toFixed(2));
    const moneyVal = Math.round(maxMoney * ratio);
    const unitVal = Math.round(maxUnits * ratio);
    gridLines.push(
      `<line x1="${padLeft}" y1="${y}" x2="${padLeft + plotW}" y2="${y}" stroke="#EAE4DC" stroke-width="1" stroke-dasharray="${i === 0 ? 'none' : '4 4'}"/>`,
      `<text x="${padLeft - 8}" y="${y + 4}" text-anchor="end" fill="#5A5D65" font-size="11" font-family="Inter, sans-serif">$${moneyVal}</text>`,
      `<text x="${width - padRight + 8}" y="${y + 4}" text-anchor="start" fill="#FB8500" font-size="11" font-weight="600" font-family="Inter, sans-serif">${unitVal}u</text>`
    );
  }

  const xLabels = points.map(
    (p) =>
      `<text x="${p.x}" y="${baselineY + 22}" text-anchor="middle" fill="#5A5D65" font-size="11" font-family="Inter, sans-serif">${escapeXml(p.label)}</text>`
  );

  const polyIngresos = points.map((p) => `${p.x},${p.yIngresos}`).join(' ');
  const polyGanancia = points.map((p) => `${p.x},${p.yGanancia}`).join(' ');
  const polyUnidades = points.map((p) => `${p.x},${p.yUnidades}`).join(' ');

  const areaPath =
    points.length > 1
      ? `M ${points[0].x} ${baselineY} L ${points.map((p) => `${p.x} ${p.yIngresos}`).join(' L ')} L ${points[points.length - 1].x} ${baselineY} Z`
      : '';

  const markers = points.map(
    (p) =>
      `<circle cx="${p.x}" cy="${p.yIngresos}" r="4.5" fill="#E63946" stroke="#FFFDF9" stroke-width="1.5"/>` +
      `<circle cx="${p.x}" cy="${p.yGanancia}" r="4.5" fill="#2A9D8F" stroke="#FFFDF9" stroke-width="1.5"/>` +
      `<circle cx="${p.x}" cy="${p.yUnidades}" r="4.5" fill="#FFB703" stroke="#FB8500" stroke-width="1.5"/>` +
      `<circle cx="${p.x}" cy="${p.yIngresos}" r="16" fill="transparent" data-point-index="${p.index}" tabindex="0" role="button" aria-label="${escapeXml(`${p.fullLabel}: Ingresos $${p.ingresos.toFixed(2)}, Ganancia $${p.ganancia_neta.toFixed(2)}, ${p.unidades} unidades`)}"/>`
  );

  return [
    `<svg class="weekly-line-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de líneas semanal: ingresos, ganancia neta y unidades vendidas">`,
    `<title>Tendencia Semanal SazónYA</title>`,
    `<desc>Ingresos en rojo #E63946, ganancia neta en verde #2A9D8F y unidades en naranja #FB8500.</desc>`,
    `<defs><linearGradient id="sazonChartArea" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#E63946" stop-opacity="0.16"/><stop offset="100%" stop-color="#E63946" stop-opacity="0.01"/></linearGradient></defs>`,
    gridLines.join(''),
    areaPath ? `<path d="${areaPath}" fill="url(#sazonChartArea)"/>` : '',
    points.length > 1
      ? `<polyline fill="none" stroke="#E63946" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polyIngresos}"/>`
      : '',
    points.length > 1
      ? `<polyline fill="none" stroke="#2A9D8F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polyGanancia}"/>`
      : '',
    points.length > 1
      ? `<polyline fill="none" stroke="#FB8500" stroke-width="2.5" stroke-dasharray="6 4" stroke-linecap="round" stroke-linejoin="round" points="${polyUnidades}"/>`
      : '',
    xLabels.join(''),
    markers.join(''),
    `</svg>`
  ].join('');
}

function svgNode(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && v !== null) {
      node.setAttribute(k, String(v));
    }
  }
  return node;
}

export function createWeeklyLineChart(stats = {}) {
  const model = buildWeeklyLineChartModel(stats);
  const { width, height, padLeft, padRight, padTop, plotW, plotH, maxMoney, maxUnits, points, source } = model;
  const baselineY = padTop + plotH;

  const tooltip = el('div', {
    className: 'chart-tooltip',
    role: 'status',
    'aria-live': 'polite'
  });

  function setTooltipPoint(pt) {
    if (!pt) {
      tooltip.textContent = 'Sin datos de ventas para mostrar.';
      return;
    }
    tooltip.textContent = `${pt.fullLabel} · Ingresos: ${formatCurrency(pt.ingresos)} · Ganancia Neta: ${formatCurrency(pt.ganancia_neta)} · Unidades: ${pt.unidades}`;
  }

  const svg = svgNode('svg', {
    class: 'weekly-line-chart-svg',
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': 'Gráfico de líneas semanal de ingresos, ganancia neta y unidades'
  });

  const titleNode = svgNode('title');
  titleNode.textContent = 'Tendencia Semanal SazónYA';
  svg.appendChild(titleNode);

  if (points.length === 0) {
    const emptyText = svgNode('text', {
      x: width / 2,
      y: height / 2,
      'text-anchor': 'middle',
      fill: '#5A5D65',
      'font-size': '14',
      'font-family': 'Inter, sans-serif'
    });
    emptyText.textContent = 'Aún no hay ventas registradas para graficar.';
    svg.appendChild(emptyText);
    setTooltipPoint(null);
  } else {
    const defs = svgNode('defs');
    const grad = svgNode('linearGradient', { id: 'sazonChartAreaDom', x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
    grad.appendChild(svgNode('stop', { offset: '0%', 'stop-color': '#E63946', 'stop-opacity': '0.16' }));
    grad.appendChild(svgNode('stop', { offset: '100%', 'stop-color': '#E63946', 'stop-opacity': '0.01' }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const ratio = i / ticks;
      const y = Number((baselineY - ratio * plotH).toFixed(2));
      svg.appendChild(
        svgNode('line', {
          x1: padLeft,
          y1: y,
          x2: padLeft + plotW,
          y2: y,
          stroke: '#EAE4DC',
          'stroke-width': '1',
          'stroke-dasharray': i === 0 ? 'none' : '4 4'
        })
      );

      const leftText = svgNode('text', {
        x: padLeft - 8,
        y: y + 4,
        'text-anchor': 'end',
        fill: '#5A5D65',
        'font-size': '11',
        'font-family': 'Inter, sans-serif'
      });
      leftText.textContent = `$${Math.round(maxMoney * ratio)}`;
      svg.appendChild(leftText);

      const rightText = svgNode('text', {
        x: width - padRight + 8,
        y: y + 4,
        'text-anchor': 'start',
        fill: '#FB8500',
        'font-size': '11',
        'font-weight': '600',
        'font-family': 'Inter, sans-serif'
      });
      rightText.textContent = `${Math.round(maxUnits * ratio)}u`;
      svg.appendChild(rightText);
    }

    if (points.length > 1) {
      const areaD = `M ${points[0].x} ${baselineY} L ${points.map((p) => `${p.x} ${p.yIngresos}`).join(' L ')} L ${points[points.length - 1].x} ${baselineY} Z`;
      svg.appendChild(svgNode('path', { d: areaD, fill: 'url(#sazonChartAreaDom)' }));

      svg.appendChild(
        svgNode('polyline', {
          fill: 'none',
          stroke: '#E63946',
          'stroke-width': '3',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          points: points.map((p) => `${p.x},${p.yIngresos}`).join(' ')
        })
      );
      svg.appendChild(
        svgNode('polyline', {
          fill: 'none',
          stroke: '#2A9D8F',
          'stroke-width': '3',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          points: points.map((p) => `${p.x},${p.yGanancia}`).join(' ')
        })
      );
      svg.appendChild(
        svgNode('polyline', {
          fill: 'none',
          stroke: '#FB8500',
          'stroke-width': '2.5',
          'stroke-dasharray': '6 4',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          points: points.map((p) => `${p.x},${p.yUnidades}`).join(' ')
        })
      );
    }

    const guideLine = svgNode('line', {
      x1: points[points.length - 1].x,
      y1: padTop,
      x2: points[points.length - 1].x,
      y2: baselineY,
      stroke: '#1D1E22',
      'stroke-opacity': '0.18',
      'stroke-width': '1.5',
      'stroke-dasharray': '3 3'
    });
    svg.appendChild(guideLine);

    for (const p of points) {
      const lbl = svgNode('text', {
        x: p.x,
        y: baselineY + 22,
        'text-anchor': 'middle',
        fill: '#5A5D65',
        'font-size': '11',
        'font-family': 'Inter, sans-serif'
      });
      lbl.textContent = p.label;
      svg.appendChild(lbl);

      svg.appendChild(
        svgNode('circle', {
          cx: p.x,
          cy: p.yIngresos,
          r: '4.5',
          fill: '#E63946',
          stroke: '#FFFDF9',
          'stroke-width': '1.5'
        })
      );
      svg.appendChild(
        svgNode('circle', {
          cx: p.x,
          cy: p.yGanancia,
          r: '4.5',
          fill: '#2A9D8F',
          stroke: '#FFFDF9',
          'stroke-width': '1.5'
        })
      );
      svg.appendChild(
        svgNode('circle', {
          cx: p.x,
          cy: p.yUnidades,
          r: '4.5',
          fill: '#FFB703',
          stroke: '#FB8500',
          'stroke-width': '1.5'
        })
      );

      const hit = svgNode('circle', {
        cx: p.x,
        cy: p.yIngresos,
        r: '16',
        fill: 'transparent',
        tabindex: '0',
        role: 'button',
        style: 'cursor: pointer;',
        'aria-label': `${p.fullLabel}: Ingresos ${formatCurrency(p.ingresos)}, Ganancia ${formatCurrency(p.ganancia_neta)}, ${p.unidades} unidades`
      });
      const activate = () => {
        guideLine.setAttribute('x1', String(p.x));
        guideLine.setAttribute('x2', String(p.x));
        setTooltipPoint(p);
      };
      hit.addEventListener('mouseenter', activate);
      hit.addEventListener('focus', activate);
      hit.addEventListener('click', activate);
      svg.appendChild(hit);
    }

    setTooltipPoint(points[points.length - 1]);
  }

  const legend = el('div', { className: 'chart-legend' }, [
    el('span', { className: 'chart-legend-item' }, [
      el('span', { className: 'chart-legend-swatch', style: { backgroundColor: '#E63946' } }),
      'Ingresos ($)'
    ]),
    el('span', { className: 'chart-legend-item' }, [
      el('span', { className: 'chart-legend-swatch', style: { backgroundColor: '#2A9D8F' } }),
      'Ganancia Neta ($)'
    ]),
    el('span', { className: 'chart-legend-item' }, [
      el('span', {
        className: 'chart-legend-swatch',
        style: { backgroundColor: '#FFB703', border: '2px solid #FB8500' }
      }),
      'Unidades (Uds)'
    ])
  ]);

  const subtitleText =
    source === 'serie_diaria'
      ? 'Serie diaria de los últimos 7 días (eje izquierdo: $, eje derecho: Uds).'
      : source === 'ganancias_por_producto'
        ? 'Desempeño por producto destacado (eje izquierdo: $, eje derecho: Uds).'
        : 'Sin actividad semanal registrada.';

  return el('section', { className: 'card chart-card', 'aria-label': 'Tendencia de ventas semanales' }, [
    el('div', { className: 'card-body' }, [
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' } }, [
        el('div', {}, [
          el('h3', {}, '📈 Tendencia Semanal: Ingresos, Ganancia y Unidades'),
          el('p', { style: { fontSize: '0.84rem', color: 'var(--text-muted)' } }, subtitleText)
        ]),
        legend
      ]),
      el('div', { className: 'chart-svg-wrap' }, [svg]),
      tooltip
    ])
  ]);
}

/* ==========================================================================
   EVENTOS SIN TARJETAS (Video / Posting + Sanitización XSS)
   ========================================================================== */
export function sanitizeMediaUrl(rawUrl, baseUrl = CONFIG.API_BASE_URL) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/uploads/')) {
    return resolveAssetUrl(trimmed, baseUrl);
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseVideoEmbed(safeUrl) {
  if (!safeUrl || typeof safeUrl !== 'string') return null;
  let parsed;
  try {
    parsed = new URL(safeUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  // YouTube (youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/)
  if (host === 'youtu.be') {
    const id = pathname.replace(/^\/+/, '').split('/')[0];
    if (/^[a-zA-Z0-9_-]{6,20}$/.test(id)) {
      return { kind: 'iframe', embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
    }
  }
  if (
    host === 'youtube.com' ||
    host.endsWith('.youtube.com') ||
    host === 'youtube-nocookie.com' ||
    host.endsWith('.youtube-nocookie.com')
  ) {
    let id = parsed.searchParams.get('v') || '';
    if (!id) {
      const m = /^\/(?:embed|shorts)\/([a-zA-Z0-9_-]{6,20})/.exec(pathname);
      if (m) id = m[1];
    }
    if (/^[a-zA-Z0-9_-]{6,20}$/.test(id)) {
      return { kind: 'iframe', embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
    }
  }

  // Vimeo (vimeo.com/123456)
  if (host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') {
    const m = /\/(?:video\/)?(\d{4,15})/.exec(pathname);
    if (m) {
      return { kind: 'iframe', embedUrl: `https://player.vimeo.com/video/${m[1]}` };
    }
  }

  // Direct HTML5 video (explicit video extension required, including for /uploads/events/)
  if (/\.(mp4|webm|ogg)$/i.test(pathname)) {
    return { kind: 'video', src: parsed.href };
  }

  return { kind: 'link', href: parsed.href };
}

export function renderCardlessEventsShowcase(
  events = [],
  { mode = 'public', onParticipate = null, baseUrl = CONFIG.API_BASE_URL } = {}
) {
  const wrapper = el('div', { className: 'events-showcase' });

  if (!Array.isArray(events) || events.length === 0) {
    wrapper.appendChild(
      el(
        'p',
        { style: { color: 'var(--text-muted)', padding: '1rem 0' } },
        'No hay eventos ni promociones activas en este momento.'
      )
    );
    return wrapper;
  }

  for (const ev of events) {
    const mediaTipo = String(ev.media_tipo || 'NONE').toUpperCase();
    const safeUrl = sanitizeMediaUrl(ev.media_url, baseUrl);
    let mediaNode = null;

    if (mediaTipo === 'VIDEO' && safeUrl) {
      const parsedVideo = parseVideoEmbed(safeUrl);
      if (parsedVideo?.kind === 'video') {
        mediaNode = el('div', { className: 'event-media-wrap' }, [
          el('video', {
            className: 'event-media-video',
            src: parsedVideo.src,
            controls: 'true',
            preload: 'metadata',
            playsinline: 'true'
          })
        ]);
      } else if (parsedVideo?.kind === 'iframe') {
        mediaNode = el('div', { className: 'event-media-wrap' }, [
          el('iframe', {
            className: 'event-media-embed',
            src: parsedVideo.embedUrl,
            title: ev.titulo || 'Video del evento',
            sandbox: 'allow-scripts allow-same-origin allow-presentation',
            referrerpolicy: 'strict-origin-when-cross-origin',
            loading: 'lazy',
            allowfullscreen: 'true'
          })
        ]);
      } else if (parsedVideo?.kind === 'link') {
        mediaNode = el('div', { className: 'event-media-wrap' }, [
          el(
            'a',
            {
              href: parsedVideo.href,
              target: '_blank',
              rel: 'noopener noreferrer',
              className: 'btn btn-outline btn-sm'
            },
            'Ver video del evento ↗'
          )
        ]);
      }
    } else if (mediaTipo === 'POSTING' && (safeUrl || ev.posting_contenido)) {
      const postingChildren = [];
      if (safeUrl) {
        const isVideoExt = /\.(mp4|webm|ogg)(\?.*)?$/i.test(safeUrl);
        if (isVideoExt) {
          postingChildren.push(
            el('video', {
              className: 'event-media-video',
              src: safeUrl,
              controls: 'true',
              preload: 'metadata',
              playsinline: 'true'
            })
          );
        } else {
          const postImg = el('img', {
            src: safeUrl,
            alt: ev.titulo || 'Publicación SazónYA',
            className: 'event-posting-img'
          });
          attachImageFallback(postImg, ev.titulo || 'Evento');
          postingChildren.push(postImg);
        }
      }
      if (ev.posting_contenido) {
        postingChildren.push(
          el('blockquote', {
            className: 'event-posting-quote',
            textContent: ev.posting_contenido
          })
        );
      }
      if (postingChildren.length > 0) {
        mediaNode = el('div', { className: 'event-posting' }, postingChildren);
      }
    }

    const badgesRow = el('div', { className: 'event-meta-row' }, [
      el('span', { className: 'badge badge-ACTIVO' }, ev.tipo || 'EVENTO'),
      Number(ev.porcentaje_descuento) > 0
        ? el('span', { className: 'badge badge-STOCK_BAJO' }, `-${ev.porcentaje_descuento}% DTO`)
        : null,
      mode === 'admin-preview' && ev.estado
        ? el('span', { className: `badge badge-${ev.estado}` }, ev.estado)
        : null
    ]);

    let actionNode = null;
    if (mode === 'public') {
      actionNode = el('div', { className: 'event-actions-row' }, [
        el(
          'a',
          {
            href: isAuthenticated() ? '#portal' : '#login',
            className: 'btn btn-secondary btn-sm'
          },
          isAuthenticated() ? 'Participar en Mi Portal' : 'Inicia sesión para participar'
        )
      ]);
    } else if (mode === 'portal') {
      actionNode = el('div', { className: 'event-actions-row' }, [
        ev.usuario_inscrito
          ? el('div', { className: 'status-banner success', style: { margin: '0' } }, [
              el('span', {}, `🎟️ Boleto: ${ev.codigo_boleto || 'Registrado'}`)
            ])
          : el(
              'button',
              {
                type: 'button',
                className: 'btn btn-primary btn-sm',
                onClick: () => {
                  if (typeof onParticipate === 'function') onParticipate(ev);
                }
              },
              'Participar Ahora'
            )
      ]);
    } else if (mode === 'admin-preview') {
      actionNode = el(
        'p',
        { style: { fontSize: '0.78rem', color: 'var(--text-muted)' } },
        'Vista previa pública sin tarjetas.'
      );
    }

    const infoColumn = el('div', { className: 'event-showcase-content' }, [
      badgesRow,
      el('h3', { className: 'event-showcase-title' }, ev.titulo || 'Evento SazónYA'),
      ev.descripcion ? el('p', { className: 'event-showcase-desc' }, ev.descripcion) : null,
      ev.premio_sorteo
        ? el('p', { className: 'event-showcase-prize' }, `🎁 Premio: ${ev.premio_sorteo}`)
        : null,
      ev.cupo_maximo
        ? el(
            'p',
            { className: 'event-showcase-quota' },
            mode === 'portal'
              ? `Inscritos: ${ev.total_inscritos || 0} / ${ev.cupo_maximo}`
              : `Cupos: ${ev.cupos_restantes ?? ev.cupo_maximo} / ${ev.cupo_maximo}`
          )
        : null,
      actionNode
    ]);

    const item = el(
      'article',
      {
        className: `event-showcase-item${mediaNode ? ' has-media' : ''}`
      },
      mediaNode ? [infoColumn, mediaNode] : [infoColumn]
    );

    wrapper.appendChild(item);
  }

  return wrapper;
}
