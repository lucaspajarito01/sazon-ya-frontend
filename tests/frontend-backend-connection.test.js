import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createNativeHttpServer } from '../../sazon-ya-backend/src/nativeHttpServer.js';
import { DatabaseAdapter } from '../../sazon-ya-backend/src/config/db.js';
import { buildContainer } from '../../sazon-ya-backend/src/container.js';
import { apiRequest } from '../src/Js/api.js';
import { saveSession, clearSession, isAuthenticated, isAdmin } from '../src/Js/session.js';
import { buildSvgDataUri, formatCurrency } from '../src/Js/ui.js';

describe('Conexión E2E Frontend (HTML5/CSS3/Vanilla JS) <-> Backend API REST', () => {
  let server;
  let baseUrl;

  before(async () => {
    const testDb = new DatabaseAdapter();
    const testContainer = buildContainer(testDb);
    server = createNativeHttpServer(testContainer);

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    clearSession();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. Verifica salud de la API, CORS y listado público de productos y eventos desde api.js del Frontend', async () => {
    const health = await apiRequest('/health', { baseUrl });
    assert.equal(health.status, 'OK');

    const catalog = await apiRequest('/products', { baseUrl });
    assert.ok(Array.isArray(catalog.data.products));
    assert.ok(catalog.data.products.length >= 6);

    const events = await apiRequest('/events?onlyActive=true', { baseUrl });
    assert.ok(Array.isArray(events.data.events));
    assert.ok(events.data.events.length >= 3);
  });

  it('2. Flujo completo de Cliente desde Frontend: Registro -> Sesión -> Pedido -> Favorito -> Reseña -> Sorteo', async () => {
    clearSession();

    const reg = await apiRequest('/auth/register', {
      method: 'POST',
      baseUrl,
      body: {
        nombre: 'Daniela Cliente Frontend',
        edad: 26,
        correo: 'daniela.fe@sazonya.com',
        password: 'Frontend2026!'
      }
    });

    saveSession({ user: reg.data.user, token: reg.data.token, remember: true });
    assert.equal(isAuthenticated(), true);
    assert.equal(isAdmin(), false);

    // Realizar pedido autenticado con token en sessionState
    const orderRes = await apiRequest('/orders', {
      method: 'POST',
      baseUrl,
      body: {
        items: [{ producto_id: 1, cantidad: 1 }],
        notas_entrega: 'Pedido enviado desde Frontend Vanilla JS'
      }
    });
    assert.equal(orderRes.data.order.total_venta, 9.9);

    // Toggle favorito
    const favRes = await apiRequest('/favorites/1/toggle', { method: 'POST', baseUrl });
    assert.equal(favRes.data.isFavorite, true);

    // Calificar producto con estrellas
    const revRes = await apiRequest('/reviews', {
      method: 'POST',
      baseUrl,
      body: {
        producto_id: 1,
        estrellas: 5,
        comentario: 'Conexión Frontend-Backend funcionando a la perfección.'
      }
    });
    assert.equal(revRes.data.producto_promedio_estrellas, 5);

    // Participar en sorteo
    const partRes = await apiRequest('/events/2/participate', { method: 'POST', baseUrl });
    assert.ok(partRes.data.participation.codigo_boleto.includes('SZY-EVT2'));
  });

  it('3. Flujo de Administrador desde Frontend: Login Admin -> Estadísticas Semanales -> CRUD Producto', async () => {
    clearSession();

    const loginRes = await apiRequest('/auth/login', {
      method: 'POST',
      baseUrl,
      body: {
        correo: 'admin@sazonya.com',
        password: 'Admin123!'
      }
    });

    saveSession({ user: loginRes.data.user, token: loginRes.data.token, remember: true });
    assert.equal(isAdmin(), true);

    const statsRes = await apiRequest('/analytics/weekly', { baseUrl });
    assert.equal(statsRes.data.producto_mas_vendido.producto_nombre, 'Sazón Brasa Doble Cheddar');

    const createProdRes = await apiRequest('/products', {
      method: 'POST',
      baseUrl,
      body: {
        categoria_id: 2,
        nombre: 'Papas Bravas SazónYA',
        descripcion: 'Papas criollas crocantes con salsa brava ahumada y tocineta.',
        costo_unitario: 2.0,
        precio_venta: 5.5,
        stock_actual: 20,
        stock_minimo: 5
      }
    });
    assert.equal(createProdRes.data.product.estado, 'DISPONIBLE');

    // Cambio de estado de evento con valores válidos del backend (CANCELADO / ACTIVO)
    const cancelEvRes = await apiRequest('/events/1/status', {
      method: 'PATCH',
      baseUrl,
      body: { estado: 'CANCELADO' }
    });
    assert.equal(cancelEvRes.data.event.estado, 'CANCELADO');

    const reactivateEvRes = await apiRequest('/events/1/status', {
      method: 'PATCH',
      baseUrl,
      body: { estado: 'ACTIVO' }
    });
    assert.equal(reactivateEvRes.data.event.estado, 'ACTIVO');

    // Utilidades UI del Frontend
    const svgUri = buildSvgDataUri('Papas Bravas SazónYA');
    assert.ok(svgUri.startsWith('data:image/svg+xml;utf8,'));
    assert.equal(formatCurrency(5.5), '$5.50');
  });
});
