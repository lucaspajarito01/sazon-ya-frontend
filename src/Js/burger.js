import { el, prefersReducedMotion } from './ui.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export const BURGER_LAYERS = Object.freeze([
  Object.freeze({
    index: 0,
    id: 'pan-superior',
    name: 'Pan superior con ajonjolí',
    subtitle: 'Brioche dorado artesanal',
    assembledOffsetY: -32,
    explodedOffsetY: -92,
    zIndex: 6
  }),
  Object.freeze({
    index: 1,
    id: 'lechuga',
    name: 'Lechuga',
    subtitle: 'Hojas frescas crocantes',
    assembledOffsetY: -18,
    explodedOffsetY: -55,
    zIndex: 5
  }),
  Object.freeze({
    index: 2,
    id: 'tomate',
    name: 'Tomate',
    subtitle: 'Rodajas jugosas de huerta',
    assembledOffsetY: -7,
    explodedOffsetY: -18,
    zIndex: 4
  }),
  Object.freeze({
    index: 3,
    id: 'queso',
    name: 'Queso cheddar',
    subtitle: 'Cheddar madurado fundido',
    assembledOffsetY: 4,
    explodedOffsetY: 18,
    zIndex: 3
  }),
  Object.freeze({
    index: 4,
    id: 'carne',
    name: 'Carne a la brasa',
    subtitle: 'Res 100% sellada al carbón',
    assembledOffsetY: 18,
    explodedOffsetY: 55,
    zIndex: 2
  }),
  Object.freeze({
    index: 5,
    id: 'pan-inferior',
    name: 'Pan inferior',
    subtitle: 'Base tostada en mantequilla',
    assembledOffsetY: 34,
    explodedOffsetY: 92,
    zIndex: 1
  })
]);

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

export function createBurgerState({ reducedMotion = false } = {}) {
  return {
    isHovered: false,
    isLockedOpen: false,
    scrollProgress: 0,
    activeLayerIndex: null,
    reducedMotion: Boolean(reducedMotion)
  };
}

export function reduceBurgerState(state, action) {
  if (!action || typeof action.type !== 'string') return state;

  switch (action.type) {
    case 'POINTER_ENTER':
      return { ...state, isHovered: true };
    case 'POINTER_LEAVE':
      return { ...state, isHovered: false, activeLayerIndex: null };
    case 'TOGGLE_LOCK':
      return { ...state, isLockedOpen: !state.isLockedOpen };
    case 'SET_LOCK':
      return { ...state, isLockedOpen: Boolean(action.value) };
    case 'SET_SCROLL':
      return {
        ...state,
        scrollProgress: clamp(Number.isFinite(Number(action.progress)) ? Number(action.progress) : 0, 0, 1)
      };
    case 'FOCUS_LAYER': {
      const idx = action.index;
      const valid = Number.isInteger(idx) && idx >= 0 && idx < BURGER_LAYERS.length;
      return { ...state, activeLayerIndex: valid ? idx : null };
    }
    case 'SET_REDUCED_MOTION':
      return { ...state, reducedMotion: Boolean(action.value) };
    default:
      return state;
  }
}

export function computeSeparationFactor(state) {
  if (!state) return 0;
  if (state.isLockedOpen || state.isHovered) return 1;
  if (state.reducedMotion) return 0;
  return clamp(Number(state.scrollProgress) || 0, 0, 1);
}

export function computeLayerTransforms(state, { spreadScale = 1 } = {}) {
  const factor = computeSeparationFactor(state);
  const parsedSpread = Number(spreadScale);
  const scaleSpread = Number.isFinite(parsedSpread) && parsedSpread > 0 ? parsedSpread : 1;

  return BURGER_LAYERS.map((layer) => {
    const rawY = layer.assembledOffsetY + (layer.explodedOffsetY - layer.assembledOffsetY) * factor;
    const isHighlighted = state?.activeLayerIndex === layer.index;
    return {
      id: layer.id,
      index: layer.index,
      name: layer.name,
      subtitle: layer.subtitle,
      translateY: Number((rawY * scaleSpread).toFixed(2)),
      scale: isHighlighted ? 1.05 : 1,
      isHighlighted,
      zIndex: layer.zIndex
    };
  });
}

export function computeScrollProgressFromRect(rect, viewportHeight = 800) {
  if (!rect) return 0;
  const top = Number(rect.top);
  const height = Number(rect.height);
  if (!Number.isFinite(top) || !Number.isFinite(height) || height <= 0) return 0;
  const vhRaw = Number(viewportHeight);
  const vh = Number.isFinite(vhRaw) && vhRaw > 0 ? vhRaw : 800;
  const scrolledPastTop = Math.max(0, -top);
  const travel = Math.max(120, Math.min(height * 0.6, vh * 0.45));
  return clamp(scrolledPastTop / travel, 0, 1);
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && v !== null) {
      node.setAttribute(k, String(v));
    }
  }
  return node;
}

let gradientUidCounter = 0;

function buildLayerSvg(layerId) {
  gradientUidCounter += 1;
  const uid = `bgrad-${layerId}-${gradientUidCounter}`;
  const svg = svgEl('svg', {
    viewBox: '0 0 220 64',
    width: '100%',
    height: 'auto',
    'aria-hidden': 'true',
    focusable: 'false'
  });

  if (layerId === 'pan-superior') {
    const defs = svgEl('defs');
    const grad = svgEl('linearGradient', { id: uid, x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#FFB703' }));
    grad.appendChild(svgEl('stop', { offset: '60%', 'stop-color': '#FB8500' }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#C96A00' }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    svg.appendChild(
      svgEl('path', {
        d: 'M24 50 C24 14, 196 14, 196 50 Q196 58, 184 58 L36 58 Q24 58, 24 50 Z',
        fill: `url(#${uid})`,
        stroke: '#D97706',
        'stroke-width': '1.5'
      })
    );
    svg.appendChild(
      svgEl('path', {
        d: 'M32 51 Q110 55 188 51',
        fill: 'none',
        stroke: '#FFFDF9',
        'stroke-opacity': '0.28',
        'stroke-width': '2',
        'stroke-linecap': 'round'
      })
    );
    const seeds = [
      [70, 29, -18],
      [95, 23, 12],
      [118, 26, -8],
      [142, 24, 16],
      [82, 37, 22],
      [110, 34, -14],
      [156, 35, -20]
    ];
    for (const [cx, cy, rot] of seeds) {
      svg.appendChild(
        svgEl('ellipse', {
          cx,
          cy,
          rx: '4.2',
          ry: '2',
          fill: '#FFFDF9',
          opacity: '0.92',
          transform: `rotate(${rot} ${cx} ${cy})`
        })
      );
    }
  } else if (layerId === 'lechuga') {
    svg.appendChild(
      svgEl('path', {
        d: 'M18 32 Q32 18 48 30 Q64 42 80 28 Q98 16 114 30 Q130 42 148 28 Q166 16 184 30 Q196 39 204 30 Q200 46 182 44 Q164 40 146 47 Q128 52 110 44 Q92 38 74 47 Q54 53 36 44 Q22 40 18 32 Z',
        fill: '#2A9D8F',
        stroke: '#1F7A6F',
        'stroke-width': '1.5'
      })
    );
    svg.appendChild(
      svgEl('path', {
        d: 'M28 33 Q48 24 68 33 Q88 41 110 31 Q132 22 154 33 Q174 42 194 32',
        fill: 'none',
        stroke: '#52B788',
        'stroke-width': '3',
        'stroke-linecap': 'round'
      })
    );
  } else if (layerId === 'tomate') {
    svg.appendChild(
      svgEl('rect', {
        x: '28',
        y: '24',
        width: '92',
        height: '18',
        rx: '9',
        fill: '#E63946',
        stroke: '#B91C1C',
        'stroke-width': '1.5'
      })
    );
    svg.appendChild(
      svgEl('rect', {
        x: '100',
        y: '26',
        width: '92',
        height: '18',
        rx: '9',
        fill: '#D62828',
        stroke: '#991B1B',
        'stroke-width': '1.5'
      })
    );
    svg.appendChild(
      svgEl('path', {
        d: 'M42 33 Q74 28 106 33 M116 35 Q148 30 178 35',
        fill: 'none',
        stroke: '#FFFDF9',
        'stroke-opacity': '0.35',
        'stroke-width': '2',
        'stroke-linecap': 'round'
      })
    );
  } else if (layerId === 'queso') {
    svg.appendChild(
      svgEl('path', {
        d: 'M24 24 L196 24 L200 34 L172 34 L158 50 L142 34 L98 34 L82 47 L68 34 L20 34 Z',
        fill: '#FFB703',
        stroke: '#FB8500',
        'stroke-width': '1.5',
        'stroke-linejoin': 'round'
      })
    );
    svg.appendChild(
      svgEl('path', {
        d: 'M32 29 L188 29',
        stroke: '#F4A261',
        'stroke-width': '2.5',
        'stroke-linecap': 'round',
        opacity: '0.65'
      })
    );
  } else if (layerId === 'carne') {
    svg.appendChild(
      svgEl('rect', {
        x: '22',
        y: '18',
        width: '176',
        height: '30',
        rx: '15',
        fill: '#4A2511',
        stroke: '#261107',
        'stroke-width': '2'
      })
    );
    const marks = [
      'M48 21 L62 45',
      'M84 21 L98 45',
      'M122 21 L136 45',
      'M158 21 L172 45'
    ];
    for (const d of marks) {
      svg.appendChild(
        svgEl('path', {
          d,
          stroke: '#1D1E22',
          'stroke-width': '4',
          'stroke-linecap': 'round',
          opacity: '0.75'
        })
      );
    }
    svg.appendChild(
      svgEl('path', {
        d: 'M38 24 Q110 20 182 24',
        fill: 'none',
        stroke: '#FB8500',
        'stroke-opacity': '0.25',
        'stroke-width': '2',
        'stroke-linecap': 'round'
      })
    );
  } else {
    svg.appendChild(
      svgEl('path', {
        d: 'M26 20 L194 20 L194 34 Q194 50 176 50 L44 50 Q26 50 26 34 Z',
        fill: '#E08E36',
        stroke: '#B86B1B',
        'stroke-width': '1.5'
      })
    );
    svg.appendChild(
      svgEl('path', {
        d: 'M34 24 L186 24',
        stroke: '#FFB703',
        'stroke-opacity': '0.45',
        'stroke-width': '3',
        'stroke-linecap': 'round'
      })
    );
  }

  return svg;
}

export function mountInteractiveBurger(
  container,
  { heroElement = null, indicatorButtons = [], toggleButton = null, onStateChange = null } = {}
) {
  if (!container) {
    return {
      destroy() {},
      getState() {
        return createBurgerState();
      },
      toggle() {}
    };
  }

  let state = createBurgerState({ reducedMotion: prefersReducedMotion() });
  let spreadScale = typeof window !== 'undefined' && window.innerWidth <= 480 ? 0.72 : 1;
  let scrollTicking = false;
  let isDestroyed = false;
  let rafId = null;
  let rafUsesTimeout = false;

  const stackNode = el('div', { className: 'burger-stack' });
  const layerNodes = [];

  for (const layer of BURGER_LAYERS) {
    const layerWrapper = el(
      'div',
      {
        className: 'burger-layer',
        dataset: { layerId: layer.id, layerIndex: String(layer.index) },
        style: { zIndex: String(layer.zIndex) }
      },
      [buildLayerSvg(layer.id)]
    );

    layerWrapper.addEventListener('pointerenter', () => {
      dispatch({ type: 'FOCUS_LAYER', index: layer.index });
    });

    layerNodes.push(layerWrapper);
    stackNode.appendChild(layerWrapper);
  }

  const captionNode = el('div', {
    className: 'burger-layer-caption',
    'aria-live': 'polite'
  });

  const stageNode = el(
    'div',
    {
      className: 'burger-stage',
      role: 'button',
      tabindex: '0',
      'aria-pressed': 'false',
      'aria-label': 'Hamburguesa artesanal interactiva. Pasa el cursor, haz clic o desliza para separar sus 6 capas.'
    },
    [stackNode]
  );

  function render() {
    const factor = computeSeparationFactor(state);
    const transforms = computeLayerTransforms(state, { spreadScale });

    stageNode.setAttribute('aria-pressed', String(state.isLockedOpen));

    for (const item of transforms) {
      const node = layerNodes[item.index];
      if (!node) continue;
      node.style.setProperty('--layer-y', `${item.translateY}px`);
      node.style.setProperty('--layer-scale', String(item.scale));
      node.style.marginTop = '-32px';
      node.classList.toggle('is-highlighted', item.isHighlighted);
    }

    indicatorButtons.forEach((btn, idx) => {
      if (!btn) return;
      const isFocused = state.activeLayerIndex === idx;
      const isExploded = factor > 0.35;
      btn.classList.toggle('is-exploded', isExploded);
      btn.classList.toggle('is-active', isFocused || (isExploded && state.activeLayerIndex === null && idx === 0));
      btn.setAttribute('aria-pressed', String(isFocused));
    });

    if (toggleButton) {
      toggleButton.setAttribute('aria-pressed', String(state.isLockedOpen));
      toggleButton.textContent = state.isLockedOpen ? '▶' : '‖';
      toggleButton.setAttribute(
        'aria-label',
        state.isLockedOpen ? 'Re-armar capas de la hamburguesa' : 'Separar capas de la hamburguesa'
      );
    }

    while (captionNode.firstChild) {
      captionNode.removeChild(captionNode.firstChild);
    }
    if (state.activeLayerIndex !== null && BURGER_LAYERS[state.activeLayerIndex]) {
      const active = BURGER_LAYERS[state.activeLayerIndex];
      captionNode.appendChild(
        el('span', {}, [
          el('strong', {}, `Capa ${active.index + 1}/6 · ${active.name}`),
          ` — ${active.subtitle}`
        ])
      );
    } else if (factor > 0.5) {
      captionNode.textContent = '6 capas separadas · Clic para armar';
    } else {
      captionNode.textContent = 'Pasa el cursor, haz clic o desliza';
    }

    if (typeof onStateChange === 'function') {
      onStateChange({ state, factor, transforms });
    }
  }

  function dispatch(action) {
    if (isDestroyed) return;
    state = reduceBurgerState(state, action);
    render();
  }

  const onStageEnter = () => dispatch({ type: 'POINTER_ENTER' });
  const onStageLeave = () => dispatch({ type: 'POINTER_LEAVE' });
  const onStageClick = () => dispatch({ type: 'TOGGLE_LOCK' });
  const onStageKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dispatch({ type: 'TOGGLE_LOCK' });
    }
  };

  stageNode.addEventListener('pointerenter', onStageEnter);
  stageNode.addEventListener('pointerleave', onStageLeave);
  stageNode.addEventListener('click', onStageClick);
  stageNode.addEventListener('keydown', onStageKeyDown);

  const indicatorCleanups = [];
  indicatorButtons.forEach((btn, idx) => {
    if (!btn) return;
    const onEnter = () => dispatch({ type: 'FOCUS_LAYER', index: idx });
    const onLeave = () => dispatch({ type: 'FOCUS_LAYER', index: null });
    const onClick = () => {
      if (state.isLockedOpen && state.activeLayerIndex === idx) {
        state = reduceBurgerState(state, { type: 'SET_LOCK', value: false });
        dispatch({ type: 'FOCUS_LAYER', index: null });
      } else {
        state = reduceBurgerState(state, { type: 'SET_LOCK', value: true });
        dispatch({ type: 'FOCUS_LAYER', index: idx });
      }
    };
    btn.addEventListener('pointerenter', onEnter);
    btn.addEventListener('pointerleave', onLeave);
    btn.addEventListener('click', onClick);
    indicatorCleanups.push(() => {
      btn.removeEventListener('pointerenter', onEnter);
      btn.removeEventListener('pointerleave', onLeave);
      btn.removeEventListener('click', onClick);
    });
  });

  const onToggleBtnClick = () => dispatch({ type: 'TOGGLE_LOCK' });
  if (toggleButton) {
    toggleButton.addEventListener('click', onToggleBtnClick);
  }

  const targetForScroll = heroElement || container;
  const onScroll = () => {
    if (isDestroyed || scrollTicking) return;
    scrollTicking = true;
    const hasRaf = typeof requestAnimationFrame === 'function';
    rafUsesTimeout = !hasRaf;
    const schedule = hasRaf ? requestAnimationFrame : (cb) => setTimeout(cb, 16);
    rafId = schedule(() => {
      rafId = null;
      scrollTicking = false;
      if (isDestroyed) return;
      const progress = computeScrollProgressFromRect(
        targetForScroll.getBoundingClientRect(),
        typeof window !== 'undefined' ? window.innerHeight : 800
      );
      dispatch({ type: 'SET_SCROLL', progress });
    });
  };

  const onResize = () => {
    if (isDestroyed) return;
    const nextScale = typeof window !== 'undefined' && window.innerWidth <= 480 ? 0.72 : 1;
    if (nextScale !== spreadScale) {
      spreadScale = nextScale;
      render();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
  }

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  container.appendChild(stageNode);
  container.appendChild(captionNode);
  render();

  return {
    getState() {
      return state;
    },
    toggle() {
      dispatch({ type: 'TOGGLE_LOCK' });
    },
    destroy() {
      isDestroyed = true;
      if (rafId !== null) {
        if (!rafUsesTimeout && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(rafId);
        } else {
          clearTimeout(rafId);
        }
        rafId = null;
      }
      scrollTicking = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
      }
      stageNode.removeEventListener('pointerenter', onStageEnter);
      stageNode.removeEventListener('pointerleave', onStageLeave);
      stageNode.removeEventListener('click', onStageClick);
      stageNode.removeEventListener('keydown', onStageKeyDown);
      if (toggleButton) {
        toggleButton.removeEventListener('click', onToggleBtnClick);
      }
      for (const fn of indicatorCleanups) fn();
    }
  };
}
