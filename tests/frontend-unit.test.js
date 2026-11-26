import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { apiRequest, ApiError, resolveAssetUrl } from '../src/Js/api.js';
import { clearSession } from '../src/Js/session.js';
import {
  BURGER_LAYERS,
  createBurgerState,
  reduceBurgerState,
  computeSeparationFactor,
  computeLayerTransforms,
  computeScrollProgressFromRect,
  mountInteractiveBurger
} from '../src/Js/burger.js';
import {
  escapeXml,
  buildWeeklyLineChartModel,
  buildWeeklyLineChartMarkup,
  sanitizeMediaUrl,
  parseVideoEmbed
} from '../src/Js/ui.js';

describe('Pruebas unitarias Frontend M2 (apiRequest, burger, SVG chart, media, contacto)', () => {
  let echoServer;
  let echoBaseUrl;

  before(async () => {
    echoServer = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        if (req.url === '/api/v1/contacts-fail') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              message: 'Datos de contacto inválidos.',
              errors: [{ field: 'correo', message: 'Correo inválido' }]
            })
          );
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            method: req.method,
            url: req.url,
            contentType: req.headers['content-type'] || null,
            rawBody
          })
        );
      });
    });

    await new Promise((resolve) => {
      echoServer.listen(0, '127.0.0.1', () => {
        const addr = echoServer.address();
        echoBaseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    clearSession();
    if (echoServer) {
      await new Promise((resolve) => echoServer.close(resolve));
    }
  });

  it('1. apiRequest envía FormData como multipart/form-data sin JSON.stringify, JSON para objetos y sin Content-Type en GET', async () => {
    const fd = new FormData();
    fd.append('nombre', 'Burger Brasa');
    fd.append('imagen', new Blob(['fake-png-bytes'], { type: 'image/png' }), 'burger.png');

    const multipartRes = await apiRequest('/products', {
      method: 'POST',
      baseUrl: echoBaseUrl,
      headers: { 'Content-Type': 'application/json' },
      body: fd
    });
    assert.ok(multipartRes.contentType.startsWith('multipart/form-data; boundary='));
    assert.ok(!multipartRes.contentType.includes('application/json'));
    assert.ok(multipartRes.rawBody.includes('Burger Brasa'));
    assert.ok(multipartRes.rawBody.includes('fake-png-bytes'));

    const jsonRes = await apiRequest('/products', {
      method: 'POST',
      baseUrl: echoBaseUrl,
      body: { nombre: 'Papas Bravas', precio_venta: 5.5 }
    });
    assert.equal(jsonRes.contentType, 'application/json');
    assert.deepEqual(JSON.parse(jsonRes.rawBody), { nombre: 'Papas Bravas', precio_venta: 5.5 });

    const getRes = await apiRequest('/products', { baseUrl: echoBaseUrl });
    assert.equal(getRes.method, 'GET');
    assert.equal(getRes.contentType, null);
  });

  it('2. resolveAssetUrl, sanitizeMediaUrl y parseVideoEmbed validan orígenes y previenen esquemas XSS', () => {
    assert.equal(
      resolveAssetUrl('/uploads/products/prod-1.png', 'http://localhost:3001/api/v1'),
      'http://localhost:3001/uploads/products/prod-1.png'
    );
    assert.equal(resolveAssetUrl('https://cdn.example.com/img.jpg'), 'https://cdn.example.com/img.jpg');
    assert.equal(resolveAssetUrl(''), '');
    assert.equal(resolveAssetUrl(null), '');

    assert.equal(sanitizeMediaUrl('javascript:alert(1)'), null);
    assert.equal(sanitizeMediaUrl('data:text/html,<script>alert(1)</script>'), null);
    assert.equal(
      sanitizeMediaUrl('/uploads/events/promo.mp4', 'http://localhost:3001/api/v1'),
      'http://localhost:3001/uploads/events/promo.mp4'
    );

    assert.deepEqual(parseVideoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), {
      kind: 'iframe',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    });
    assert.deepEqual(parseVideoEmbed('https://youtu.be/abcDEF_123'), {
      kind: 'iframe',
      embedUrl: 'https://www.youtube-nocookie.com/embed/abcDEF_123'
    });
    assert.deepEqual(parseVideoEmbed('https://vimeo.com/12345678'), {
      kind: 'iframe',
      embedUrl: 'https://player.vimeo.com/video/12345678'
    });
    assert.deepEqual(parseVideoEmbed('http://localhost:3001/uploads/events/clip.mp4'), {
      kind: 'video',
      src: 'http://localhost:3001/uploads/events/clip.mp4'
    });
    assert.deepEqual(parseVideoEmbed('https://untrusted-embed.example.org/video'), {
      kind: 'link',
      href: 'https://untrusted-embed.example.org/video'
    });
  });

  it('3. Lógica pura de hamburguesa interactiva de 6 capas (hover, click-lock, scroll, reducedMotion)', () => {
    assert.equal(BURGER_LAYERS.length, 6);

    let state = createBurgerState({ reducedMotion: false });
    assert.equal(computeSeparationFactor(state), 0);

    const assembled = computeLayerTransforms(state);
    assert.equal(assembled.length, 6);
    assert.equal(assembled[0].translateY, BURGER_LAYERS[0].assembledOffsetY);

    state = reduceBurgerState(state, { type: 'POINTER_ENTER' });
    assert.equal(computeSeparationFactor(state), 1);

    state = reduceBurgerState(state, { type: 'POINTER_LEAVE' });
    assert.equal(computeSeparationFactor(state), 0);

    state = reduceBurgerState(state, { type: 'TOGGLE_LOCK' });
    assert.equal(computeSeparationFactor(state), 1);

    const exploded = computeLayerTransforms(state);
    assert.equal(exploded[0].translateY, BURGER_LAYERS[0].explodedOffsetY);
    assert.equal(exploded[5].translateY, BURGER_LAYERS[5].explodedOffsetY);

    state = reduceBurgerState(state, { type: 'FOCUS_LAYER', index: 4 });
    const focused = computeLayerTransforms(state);
    assert.equal(focused[4].isHighlighted, true);
    assert.equal(focused[4].scale, 1.05);

    state = reduceBurgerState(state, { type: 'TOGGLE_LOCK' });
    state = reduceBurgerState(state, { type: 'SET_SCROLL', progress: 0.5 });
    assert.equal(computeSeparationFactor(state), 0.5);

    // Respeta prefers-reduced-motion en scroll
    const reducedState = reduceBurgerState(
      createBurgerState({ reducedMotion: true }),
      { type: 'SET_SCROLL', progress: 0.8 }
    );
    assert.equal(computeSeparationFactor(reducedState), 0);

    assert.equal(computeScrollProgressFromRect({ top: 100, height: 400 }, 800), 0);
    assert.ok(computeScrollProgressFromRect({ top: -150, height: 400 }, 800) > 0);
  });

  it('4. buildWeeklyLineChartModel y buildWeeklyLineChartMarkup consumen serie_diaria, hacen fallback y escapan XML', () => {
    const dailyStats = {
      serie_diaria: [
        { fecha: '2026-11-20', pedidos: 3, unidades: 8, ingresos: 75.5, ganancia_neta: 34.2 },
        { fecha: '2026-11-21', pedidos: 5, unidades: 14, ingresos: 132.0, ganancia_neta: 61.5 }
      ]
    };
    const dailyModel = buildWeeklyLineChartModel(dailyStats);
    assert.equal(dailyModel.source, 'serie_diaria');
    assert.equal(dailyModel.points.length, 2);

    const svg = buildWeeklyLineChartMarkup(dailyStats);
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('<polyline'));
    assert.ok(svg.includes('#E63946'));
    assert.ok(svg.includes('#2A9D8F'));
    assert.ok(svg.includes('#FB8500'));
    assert.ok(svg.includes('#FFB703'));
    assert.ok(svg.includes('20/11'));

    // Fallback a ganancias_por_producto cuando falta serie_diaria
    const fallbackStats = {
      ganancias_por_producto: [
        { producto_nombre: 'Burger <Script> & Co', unidades_vendidas: 10, ingresos_totales: 99, ganancia_neta: 50 }
      ]
    };
    const fbModel = buildWeeklyLineChartModel(fallbackStats);
    assert.equal(fbModel.source, 'ganancias_por_producto');
    assert.equal(fbModel.points.length, 1);
    assert.ok(Number.isFinite(fbModel.points[0].x));

    const fbSvg = buildWeeklyLineChartMarkup(fallbackStats);
    assert.ok(!fbSvg.includes('<Script>'));
    assert.equal(escapeXml('<a&"b\'>'), '&lt;a&amp;&quot;b&apos;&gt;');

    // Caso vacío sin NaN
    const emptyModel = buildWeeklyLineChartModel({});
    assert.equal(emptyModel.source, 'empty');
    assert.ok(buildWeeklyLineChartMarkup({}).includes('Aún no hay ventas'));
  });

  it('5. Contrato del formulario de contacto POST /contacts y propagación de errores ApiError', async () => {
    const payload = {
      nombre: 'Lucas',
      correo: 'lucas@sazonya.com',
      asunto: 'Reserva grupo',
      mensaje: 'Quisiera reservar una mesa para 6 personas el viernes.'
    };
    const res = await apiRequest('/contacts', {
      method: 'POST',
      baseUrl: echoBaseUrl,
      body: payload
    });
    assert.equal(res.method, 'POST');
    assert.equal(res.url, '/api/v1/contacts');
    assert.deepEqual(JSON.parse(res.rawBody), payload);

    await assert.rejects(
      () =>
        apiRequest('/contacts-fail', {
          method: 'POST',
          baseUrl: echoBaseUrl,
          body: { nombre: 'L', correo: 'mal', asunto: 'x', mensaje: 'corto' }
        }),
      (err) => err instanceof ApiError && err.status === 400 && err.errors[0].field === 'correo'
    );
  });

  it('6. Endurecimiento: SVG chart sin NaN/Infinity, parseVideoEmbed estricto y resolveAssetUrl/apiRequest seguros', async () => {
    // Chart con strings no numéricos e Infinity
    const poisonedStats = {
      serie_diaria: [
        { fecha: '2026-11-20', pedidos: 'abc', unidades: 'abc', ingresos: 'not-a-number', ganancia_neta: Infinity },
        { fecha: '2026-11-21', pedidos: 2, unidades: 4, ingresos: 100, ganancia_neta: 45 }
      ]
    };
    const model = buildWeeklyLineChartModel(poisonedStats);
    assert.equal(model.points.length, 2);
    assert.ok(Number.isFinite(model.maxMoney));
    assert.ok(Number.isFinite(model.maxUnits));
    for (const pt of model.points) {
      assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.yIngresos) && Number.isFinite(pt.yGanancia) && Number.isFinite(pt.yUnidades));
    }
    const svg = buildWeeklyLineChartMarkup(poisonedStats);
    assert.ok(!svg.includes('NaN'));
    assert.ok(!svg.includes('Infinity'));

    // parseVideoEmbed: dot-boundary YouTube, extensión explícita en /uploads/events/ y rechazo de esquemas peligrosos
    const evilYoutube = parseVideoEmbed('https://evil-youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(evilYoutube.kind, 'link');
    assert.equal(evilYoutube.href, 'https://evil-youtube.com/watch?v=dQw4w9WgXcQ');

    const phishUpload = parseVideoEmbed('http://localhost:3001/uploads/events/phish.html');
    assert.equal(phishUpload.kind, 'link');
    assert.equal(phishUpload.href, 'http://localhost:3001/uploads/events/phish.html');

    assert.equal(parseVideoEmbed('javascript:alert(1)'), null);

    // resolveAssetUrl rechaza esquemas peligrosos y apiRequest normaliza trailing slash en baseUrl
    assert.equal(resolveAssetUrl('javascript:alert(1)'), '');
    assert.equal(resolveAssetUrl('  JaVaScRiPt:alert(1) '), '');
    assert.equal(resolveAssetUrl('java\tscript:alert(1)'), '');
    assert.equal(resolveAssetUrl('data:text/html,<script>alert(1)</script>'), '');
    assert.equal(resolveAssetUrl('vbscript:msgbox(1)'), '');

    const normalizedRes = await apiRequest('/products', { baseUrl: `${echoBaseUrl}///` });
    assert.equal(normalizedRes.url, '/api/v1/products');
  });

  it('7. Endurecimiento burger.js: rect inválido, spreadScale negativo y cancelación de rAF en destroy()', () => {
    assert.equal(computeScrollProgressFromRect({ top: 'bad', height: 400 }, 800), 0);
    assert.equal(computeScrollProgressFromRect({ top: -150, height: -200 }, 800), 0);
    assert.equal(computeScrollProgressFromRect({ top: -150, height: 0 }, 800), 0);

    const safeTransforms = computeLayerTransforms(createBurgerState(), { spreadScale: -1 });
    assert.ok(safeTransforms[0].translateY < safeTransforms[5].translateY);

    // Simular DOM mínimo para verificar cancelación de requestAnimationFrame pendiente al llamar destroy()
    const origDocument = globalThis.document;
    const origWindow = globalThis.window;
    const origNode = globalThis.Node;
    const origRaf = globalThis.requestAnimationFrame;
    const origCancelRaf = globalThis.cancelAnimationFrame;

    try {
      class FakeNode {
        constructor(tagName = '') {
          this.tagName = tagName;
          this.childNodes = [];
          this.attributes = {};
          this.listeners = new Map();
          this.dataset = {};
          this.className = '';
          this.textContent = '';
          const classes = new Set();
          this.classList = {
            toggle: (cls, force) => {
              if (force === undefined) {
                if (classes.has(cls)) classes.delete(cls);
                else classes.add(cls);
              } else if (force) {
                classes.add(cls);
              } else {
                classes.delete(cls);
              }
            },
            contains: (cls) => classes.has(cls)
          };
          const props = new Map();
          this.style = {
            setProperty: (k, v) => props.set(k, v),
            getPropertyValue: (k) => props.get(k) || ''
          };
        }
        get firstChild() {
          return this.childNodes[0] || null;
        }
        appendChild(child) {
          this.childNodes.push(child);
          return child;
        }
        removeChild(child) {
          const idx = this.childNodes.indexOf(child);
          if (idx >= 0) this.childNodes.splice(idx, 1);
          return child;
        }
        setAttribute(k, v) {
          this.attributes[k] = String(v);
        }
        addEventListener(type, fn) {
          if (!this.listeners.has(type)) this.listeners.set(type, new Set());
          this.listeners.get(type).add(fn);
        }
        removeEventListener(type, fn) {
          this.listeners.get(type)?.delete(fn);
        }
        getBoundingClientRect() {
          return { top: -150, height: 400 };
        }
      }

      const windowListeners = new Map();
      const queuedCallbacks = [];
      let canceledIds = [];

      globalThis.Node = FakeNode;
      globalThis.document = {
        createElement: (tag) => new FakeNode(tag),
        createElementNS: (_ns, tag) => new FakeNode(tag),
        createTextNode: (text) => {
          const n = new FakeNode('#text');
          n.textContent = text;
          return n;
        }
      };
      globalThis.window = {
        innerWidth: 1280,
        innerHeight: 800,
        matchMedia: () => ({ matches: false }),
        addEventListener: (type, fn) => {
          if (!windowListeners.has(type)) windowListeners.set(type, new Set());
          windowListeners.get(type).add(fn);
        },
        removeEventListener: (type, fn) => {
          windowListeners.get(type)?.delete(fn);
        }
      };
      globalThis.requestAnimationFrame = (cb) => {
        queuedCallbacks.push(cb);
        return queuedCallbacks.length;
      };
      globalThis.cancelAnimationFrame = (id) => {
        canceledIds.push(id);
      };

      let stateChanges = 0;
      const mountNode = new FakeNode('div');
      const controller = mountInteractiveBurger(mountNode, {
        onStateChange: () => {
          stateChanges += 1;
        }
      });
      const initialChanges = stateChanges;

      for (const fn of windowListeners.get('scroll') || []) {
        fn();
      }
      assert.equal(queuedCallbacks.length, 1);

      controller.destroy();
      assert.deepEqual(canceledIds, [1]);

      // Invocar manualmente el callback rAF ya encolado no debe mutar estado ni disparar render post-destroy
      queuedCallbacks[0]();
      assert.equal(stateChanges, initialChanges);
      assert.equal(controller.getState().scrollProgress, 0);
    } finally {
      globalThis.document = origDocument;
      globalThis.window = origWindow;
      globalThis.Node = origNode;
      globalThis.requestAnimationFrame = origRaf;
      globalThis.cancelAnimationFrame = origCancelRaf;
    }
  });

  it('8. Remediación R3: apiRequest preserva Content-Type (Headers y lowercase) y chart evita NaN/Infinity en 1.7e308', async () => {
    const headersInstanceRes = await apiRequest('/orders', {
      method: 'POST',
      baseUrl: `${echoBaseUrl}/`,
      headers: new Headers({ 'Content-Type': 'text/plain' }),
      body: { item: 1 }
    });
    assert.equal(headersInstanceRes.contentType, 'text/plain');
    assert.deepEqual(JSON.parse(headersInstanceRes.rawBody), { item: 1 });

    const lowercaseHeaderRes = await apiRequest('/orders', {
      method: 'POST',
      baseUrl: echoBaseUrl,
      headers: { 'content-type': 'application/merge-patch+json' },
      body: { item: 2 }
    });
    assert.equal(lowercaseHeaderRes.contentType, 'application/merge-patch+json');
    assert.deepEqual(JSON.parse(lowercaseHeaderRes.rawBody), { item: 2 });

    const hugeStats = {
      serie_diaria: [
        { fecha: '2026-11-20', pedidos: 1, unidades: 1.7e308, ingresos: 1.7e308, ganancia_neta: 1e308 },
        { fecha: '2026-11-21', pedidos: 2, unidades: 1.5e308, ingresos: 1.4e308, ganancia_neta: 9e307 }
      ]
    };
    const hugeModel = buildWeeklyLineChartModel(hugeStats);
    assert.ok(Number.isFinite(hugeModel.maxMoney));
    assert.ok(Number.isFinite(hugeModel.maxUnits));
    assert.ok(hugeModel.maxMoney >= 1.7e308);
    assert.ok(hugeModel.maxUnits >= 1.7e308);

    const hugeSvg = buildWeeklyLineChartMarkup(hugeStats);
    assert.ok(!hugeSvg.includes('NaN'));
    assert.ok(!hugeSvg.includes('Infinity'));

    // Caso límite intermedio donde raw = 1.4e308 * 1.15 = 1.61e308 es finito, pero Math.ceil(raw / step) * step = 2e308 desborda
    const stepOverflowStats = {
      serie_diaria: [
        { fecha: '2026-11-22', pedidos: 1, unidades: 1.4e308, ingresos: 1.4e308, ganancia_neta: 5e307 }
      ]
    };
    const stepOverflowModel = buildWeeklyLineChartModel(stepOverflowStats);
    assert.ok(Number.isFinite(stepOverflowModel.maxMoney));
    assert.ok(Number.isFinite(stepOverflowModel.maxUnits));
    assert.ok(!buildWeeklyLineChartMarkup(stepOverflowStats).includes('NaN'));
    assert.ok(!buildWeeklyLineChartMarkup(stepOverflowStats).includes('Infinity'));
  });
});
