/**
 * Manipulación segura del DOM contra XSS (createElement, textContent),
 * cadena de fallback de imágenes en 3 etapas, mapeo de errores a inputs
 * (aria-invalid="true") y motor de animaciones nativas en JavaScript (60 FPS).
 */

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
    const stage = Number(imgElement.dataset.fallbackStage || 0);
    if (stage === 0) {
      imgElement.dataset.fallbackStage = '1';
      const seed = encodeURIComponent(productName.toLowerCase().replace(/\s+/g, '-'));
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
