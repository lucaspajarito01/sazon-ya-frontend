import { CONFIG } from './config.js';
import { ROLES } from './roles.js';
import {
  sessionState,
  saveSession,
  clearSession,
  isAuthenticated,
  isAdmin,
  onSessionChange
} from './session.js';
import { apiRequest, resolveAssetUrl } from './api.js';
import { mountInteractiveBurger, BURGER_LAYERS } from './burger.js';
import {
  el,
  clearContainer,
  buildSvgDataUri,
  attachImageFallback,
  formatCurrency,
  animateStaggerCards,
  animatePulse,
  animateCounter,
  showNotification,
  applyFormErrors,
  createWeeklyLineChart,
  renderCardlessEventsShowcase
} from './ui.js';

const appState = {
  route: null,
  homeTab: 'all',
  userTab: 'pedidos',
  adminTab: 'estadisticas',
  products: [],
  categories: [],
  condiments: [],
  events: [],
  favorites: [],
  reviews: [],
  recommendations: [],
  myOrders: [],
  weeklyStats: null,
  cart: [],
  editingProduct: null,
  editingEvent: null
};

let activeBurgerController = null;
let navToggleWired = false;
let homeTabSyncHandler = null;
let activeProductPreviewUrl = null;
let activeEventPreviewUrl = null;

function revokeProductPreviewUrl() {
  if (activeProductPreviewUrl) {
    URL.revokeObjectURL(activeProductPreviewUrl);
    activeProductPreviewUrl = null;
  }
}

function revokeEventPreviewUrl() {
  if (activeEventPreviewUrl) {
    URL.revokeObjectURL(activeEventPreviewUrl);
    activeEventPreviewUrl = null;
  }
}

function revokeAllAdminPreviewUrls() {
  revokeProductPreviewUrl();
  revokeEventPreviewUrl();
}

function closeMobileNav() {
  const nav = document.getElementById('nav-actions');
  const toggle = document.getElementById('nav-toggle');
  if (nav) nav.classList.remove('is-open');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function navigate(route) {
  window.location.hash = `#${route}`;
}

function renderNavbar() {
  const nav = document.getElementById('nav-actions');
  const toggle = document.getElementById('nav-toggle');
  if (!nav) return;
  clearContainer(nav);

  if (toggle && !navToggleWired) {
    navToggleWired = true;
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  const links = [
    { label: 'Inicio', hash: '#home' },
    { label: 'Menú', hash: '#catalogo' },
    { label: 'Eventos', hash: '#eventos' },
    { label: 'Nosotros', hash: '#quienes-somos' },
    { label: 'Contacto', hash: '#contacto' }
  ];

  for (const item of links) {
    nav.appendChild(
      el(
        'a',
        {
          href: item.hash,
          className: `nav-link ${appState.route === 'home' && item.hash === '#home' ? 'active' : ''}`,
          onClick: () => closeMobileNav()
        },
        item.label
      )
    );
  }

  if (!isAuthenticated()) {
    nav.appendChild(
      el('a', { href: '#login', className: 'btn btn-outline btn-sm', onClick: () => closeMobileNav() }, 'Iniciar Sesión')
    );
    nav.appendChild(
      el('a', { href: '#register', className: 'btn btn-primary btn-sm', onClick: () => closeMobileNav() }, 'Registrarse')
    );
  } else {
    if (isAdmin()) {
      nav.appendChild(
        el('a', { href: '#admin', className: 'btn btn-secondary btn-sm', onClick: () => closeMobileNav() }, 'Panel Admin')
      );
    }
    const firstName = (sessionState.user?.nombre || 'Cliente').split(' ')[0];
    nav.appendChild(
      el('a', { href: '#portal', className: 'btn btn-primary btn-sm', onClick: () => closeMobileNav() }, `Mi Portal (${firstName})`)
    );
    nav.appendChild(
      el(
        'button',
        {
          type: 'button',
          className: 'btn btn-outline btn-sm',
          onClick: () => {
            closeMobileNav();
            clearSession();
            showNotification('Sesión cerrada correctamente.', 'success');
            navigate('login');
          }
        },
        'Salir'
      )
    );
  }
}

/* ==========================================================================
   1. VISTA GENERAL PÚBLICA (Hero Minimalista + Hamburguesa, Menú, Eventos, Contacto)
   ========================================================================== */
const HOME_TABS = [
  { key: 'all', label: 'Todo' },
  { key: 'hamburguesas', label: 'Hamburguesas' },
  { key: 'acompanamientos', label: 'Acompañamientos' },
  { key: 'bebidas', label: 'Bebidas' },
  { key: 'eventos', label: 'Eventos' }
];

function filterProductsByHomeTab(products = [], categories = [], tabKey = 'all') {
  if (tabKey === 'all') return products;
  const catNameById = new Map(categories.map((c) => [Number(c.id), String(c.nombre || '').toLowerCase()]));

  return products.filter((prod) => {
    const catId = Number(prod.categoria_id);
    const catName = catNameById.get(catId) || '';
    if (tabKey === 'hamburguesas') {
      return catName.includes('hamburguesa') || catName.includes('combo') || catId === 1 || catId === 3;
    }
    if (tabKey === 'acompanamientos') {
      return catName.includes('papas') || catName.includes('acompañ') || catId === 2;
    }
    if (tabKey === 'bebidas') {
      return catName.includes('bebida') || catName.includes('malteada') || catId === 4;
    }
    return true;
  });
}

async function renderHomeView(root) {
  activeBurgerController?.destroy();
  activeBurgerController = null;
  clearContainer(root);
  const about = CONFIG.ABOUT_INFO;

  const burgerMount = el('div', { id: 'hero-burger-mount' });
  const segmentBtns = BURGER_LAYERS.map((layer, idx) =>
    el('button', {
      type: 'button',
      className: 'hero-segment',
      'aria-label': `Capa ${idx + 1}: ${layer.name}`,
      'aria-pressed': 'false'
    })
  );
  const toggleBtn = el(
    'button',
    {
      type: 'button',
      className: 'hero-toggle-btn',
      'aria-pressed': 'false',
      'aria-label': 'Separar capas de la hamburguesa'
    },
    '‖'
  );

  const hero = el('section', { className: 'hero', 'aria-label': 'Presentación principal SazónYA' }, [
    el('div', { className: 'hero-stage' }, [
      el('div', { className: 'hero-visual' }, [burgerMount]),
      el('div', { className: 'hero-copy' }, [
        el('h1', { className: 'hero-title' }, ['Sazón a la brasa', el('br'), 'en cada capa']),
        el('p', { className: 'hero-subtitle' }, 'Explora nuestra burger artesanal capa por capa.'),
        el('a', { href: '#catalogo', className: 'btn hero-cta' }, 'Explorar menú')
      ])
    ]),
    el('div', { className: 'hero-controls' }, [
      el('div', { className: 'hero-segments' }, segmentBtns),
      toggleBtn
    ])
  ]);

  const productsGrid = el('div', { className: 'grid-3', id: 'home-products-grid' });
  const eventsTabPanel = el(
    'div',
    {
      id: 'home-events-tab-panel',
      className: 'home-events-tab-panel',
      role: 'tabpanel',
      hidden: 'true'
    },
    [
      el(
        'p',
        { className: 'home-events-tab-note' },
        'Explora nuestras promociones, sorteos y experiencias de temporada.'
      ),
      el(
        'button',
        {
          type: 'button',
          className: 'btn btn-primary btn-sm',
          onClick: () => {
            document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' });
          }
        },
        'Ir a la sección de Eventos'
      )
    ]
  );
  const tabButtons = [];

  function syncHomeTabs(activeKey) {
    appState.homeTab = activeKey;
    for (const { key, btn } of tabButtons) {
      const selected = key === activeKey;
      btn.classList.toggle('active', selected);
      btn.setAttribute('aria-selected', String(selected));
    }
    if (activeKey === 'eventos') {
      productsGrid.hidden = true;
      eventsTabPanel.hidden = false;
    } else {
      productsGrid.hidden = false;
      eventsTabPanel.hidden = true;
      populateHomeProducts(productsGrid);
    }
  }
  homeTabSyncHandler = syncHomeTabs;

  const tabBar = el('div', { className: 'tab-bar', role: 'tablist', 'aria-label': 'Categorías del menú' });
  for (const t of HOME_TABS) {
    const selected = appState.homeTab === t.key;
    const btn = el(
      'button',
      {
        type: 'button',
        role: 'tab',
        className: `tab-btn${selected ? ' active' : ''}`,
        'aria-selected': String(selected),
        onClick: () => syncHomeTabs(t.key)
      },
      t.label
    );
    tabButtons.push({ key: t.key, btn });
    tabBar.appendChild(btn);
  }

  const catalogSection = el('section', { id: 'catalogo', className: 'showcase-section' }, [
    el('div', { className: 'showcase-header' }, [
      el('h2', { className: 'showcase-heading' }, 'Explora nuestras especialidades'),
      el(
        'button',
        {
          type: 'button',
          className: 'showcase-link',
          onClick: () => {
            syncHomeTabs('all');
            productsGrid.scrollIntoView({ behavior: 'smooth' });
          }
        },
        'Ver todo el menú'
      )
    ]),
    tabBar,
    productsGrid,
    eventsTabPanel
  ]);

  const eventsHost = el('div', { id: 'home-events-showcase' });
  const eventsSection = el('section', { id: 'eventos', className: 'showcase-section' }, [
    el('div', { style: { marginBottom: '1rem' } }, [
      el('h2', {}, 'Eventos y Promociones'),
      el('p', { style: { color: 'var(--text-muted)', fontSize: '0.92rem' } }, 'Activaciones, videos y sorteos vigentes.')
    ]),
    eventsHost
  ]);

  const aboutSection = el('section', { id: 'quienes-somos', className: 'about-strip' }, [
    el('div', { className: 'about-strip-header' }, [
      el('h2', { style: { color: 'var(--color-primary)' } }, 'Nuestra esencia'),
      el('p', { style: { color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '620px' } }, about.historia)
    ]),
    el('div', { className: 'about-pillars' }, [
      el('div', { className: 'about-pillar' }, [
        el('h4', { style: { color: 'var(--color-accent)' } }, '100% Brasa'),
        el('p', {}, 'Pan brioche diario y carne sellada al carbón.')
      ]),
      el('div', { className: 'about-pillar' }, [
        el('h4', { style: { color: 'var(--color-primary)' } }, 'Reseñas Reales'),
        el('p', {}, 'Calificaciones verificadas de nuestra comunidad.')
      ]),
      el('div', { className: 'about-pillar' }, [
        el('h4', { style: { color: 'var(--status-success)' } }, 'Eventos Activos'),
        el('p', {}, 'Promociones semanales y sorteos con boleto digital.')
      ])
    ])
  ]);

  // Sección HTML dedicada de Contacto (Distribución no lineal + Formulario conectado a POST /api/v1/contacts)
  const contactNombre = el('input', {
    id: 'contact-nombre',
    name: 'nombre',
    type: 'text',
    className: 'form-control',
    placeholder: 'Tu nombre',
    'aria-invalid': 'false',
    required: 'true'
  });
  const contactCorreo = el('input', {
    id: 'contact-correo',
    name: 'correo',
    type: 'email',
    className: 'form-control',
    placeholder: 'tu@correo.com',
    'aria-invalid': 'false',
    required: 'true'
  });
  const contactAsunto = el('input', {
    id: 'contact-asunto',
    name: 'asunto',
    type: 'text',
    className: 'form-control',
    placeholder: 'Reserva, evento o consulta',
    'aria-invalid': 'false',
    required: 'true'
  });
  const contactMensaje = el('textarea', {
    id: 'contact-mensaje',
    name: 'mensaje',
    rows: '3',
    className: 'form-control',
    placeholder: 'Cuéntanos en qué podemos ayudarte...',
    'aria-invalid': 'false',
    required: 'true'
  });
  const contactStatus = el('div', {
    id: 'contact-status',
    role: 'status',
    'aria-live': 'polite'
  });
  const contactSubmitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Enviar Mensaje');

  const contactForm = el(
    'form',
    {
      id: 'contact-form',
      novalidate: 'true',
      onSubmit: async (e) => {
        e.preventDefault();
        applyFormErrors(contactForm, []);
        clearContainer(contactStatus);

        const nombre = contactNombre.value.trim();
        const correo = contactCorreo.value.trim();
        const asunto = contactAsunto.value.trim();
        const mensaje = contactMensaje.value.trim();

        const localErrors = [];
        if (nombre.length < 2) {
          localErrors.push({ field: 'nombre', message: 'Ingresa tu nombre (mínimo 2 caracteres).' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
          localErrors.push({ field: 'correo', message: 'Ingresa un correo electrónico válido.' });
        }
        if (asunto.length < 3) {
          localErrors.push({ field: 'asunto', message: 'El asunto debe tener al menos 3 caracteres.' });
        }
        if (mensaje.length < 10) {
          localErrors.push({ field: 'mensaje', message: 'El mensaje debe tener al menos 10 caracteres.' });
        }
        if (localErrors.length > 0) {
          applyFormErrors(contactForm, localErrors);
          return;
        }

        contactSubmitBtn.disabled = true;
        contactSubmitBtn.textContent = 'Enviando...';
        try {
          const res = await apiRequest('/contacts', {
            method: 'POST',
            body: { nombre, correo, asunto, mensaje }
          });
          contactForm.reset();
          applyFormErrors(contactForm, []);
          contactStatus.appendChild(
            el('div', { className: 'status-banner success', style: { margin: '0.5rem 0 0' } }, [
              el('span', {}, res.message || 'Mensaje enviado. Te responderemos pronto.')
            ])
          );
        } catch (err) {
          applyFormErrors(contactForm, err.errors || []);
          contactStatus.appendChild(
            el('div', { className: 'status-banner error', style: { margin: '0.5rem 0 0' } }, [
              el('span', {}, err.message || 'No se pudo enviar el mensaje.')
            ])
          );
        } finally {
          contactSubmitBtn.disabled = false;
          contactSubmitBtn.textContent = 'Enviar Mensaje';
        }
      }
    },
    [
      el('div', { className: 'form-row-2' }, [
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label', for: 'contact-nombre' }, 'Nombre'),
          contactNombre,
          el('span', { className: 'field-error', 'data-error-for': 'nombre' })
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label', for: 'contact-correo' }, 'Correo'),
          contactCorreo,
          el('span', { className: 'field-error', 'data-error-for': 'correo' })
        ])
      ]),
      el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label', for: 'contact-asunto' }, 'Asunto'),
        contactAsunto,
        el('span', { className: 'field-error', 'data-error-for': 'asunto' })
      ]),
      el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label', for: 'contact-mensaje' }, 'Mensaje'),
        contactMensaje,
        el('span', { className: 'field-error', 'data-error-for': 'mensaje' })
      ]),
      contactSubmitBtn,
      contactStatus
    ]
  );

  const contactSection = el(
    'section',
    { id: 'contacto', className: 'contact-section', 'aria-labelledby': 'contacto-title' },
    [
      el('div', { className: 'contact-header' }, [
        el('h2', { id: 'contacto-title', style: { color: 'var(--color-primary)' } }, 'Contacto y Ubicación'),
        el('p', { style: { color: 'var(--text-muted)', fontSize: '0.92rem' } }, 'Visítanos en la parrilla o envíanos un mensaje directo.')
      ]),
      el('div', { className: 'contact-bento' }, [
        el('div', { className: 'contact-tile contact-tile--location' }, [
          el('small', { style: { color: 'var(--color-secondary)', fontWeight: '700', letterSpacing: '0.04em' } }, 'SEDE PRINCIPAL'),
          el('h3', {}, '📍 Zona Grill Central'),
          el('p', { style: { opacity: '0.86', fontSize: '0.92rem' } }, about.contacto.direccion)
        ]),
        el('div', { className: 'contact-tile contact-tile--phone' }, [
          el('small', { style: { color: 'var(--color-primary)', fontWeight: '700' } }, 'DOMICILIOS Y RESERVAS'),
          el('h4', {}, '📞 Teléfono'),
          el('p', { style: { color: 'var(--text-muted)', fontSize: '0.9rem' } }, about.contacto.telefono)
        ]),
        el('div', { className: 'contact-tile contact-tile--email' }, [
          el('small', { style: { color: 'var(--color-accent)', fontWeight: '700' } }, 'ATENCIÓN DIGITAL'),
          el('h4', {}, '✉️ Correo'),
          el('p', { style: { color: 'var(--text-muted)', fontSize: '0.9rem' } }, about.contacto.correo)
        ]),
        el('div', { className: 'contact-tile contact-tile--hours' }, [
          el('div', {}, [
            el('small', { style: { color: '#b85d19', fontWeight: '700' } }, 'HORARIO DE PARRILLA'),
            el('h4', { style: { marginTop: '0.2rem' } }, '🕒 Abiertos hoy'),
            el('p', { style: { color: 'var(--text-primary)', fontSize: '0.9rem', marginTop: '0.35rem' } }, about.contacto.horario)
          ]),
          el('span', { className: 'badge badge-ACTIVO', style: { alignSelf: 'flex-start' } }, 'Brasa en vivo')
        ]),
        el('div', { className: 'contact-tile contact-tile--form' }, [
          el('h3', { style: { marginBottom: '0.35rem' } }, 'Escríbenos'),
          contactForm
        ])
      ])
    ]
  );

  root.appendChild(hero);
  root.appendChild(catalogSection);
  root.appendChild(eventsSection);
  root.appendChild(aboutSection);
  root.appendChild(contactSection);

  activeBurgerController = mountInteractiveBurger(burgerMount, {
    heroElement: hero,
    indicatorButtons: segmentBtns,
    toggleButton: toggleBtn
  });

  try {
    const [prodRes, evRes] = await Promise.all([
      apiRequest('/products'),
      apiRequest('/events?onlyActive=true')
    ]);
    appState.products = prodRes.data.products || [];
    appState.categories = prodRes.data.categories || [];
    appState.events = evRes.data.events || [];

    syncHomeTabs(appState.homeTab);
    populateHomeEvents(eventsHost);
  } catch (err) {
    showNotification(err.message || 'No se pudo conectar con el backend de SazónYA.', 'error');
  }
}

function populateHomeProducts(grid) {
  clearContainer(grid);
  const filtered = filterProductsByHomeTab(appState.products, appState.categories, appState.homeTab);

  if (filtered.length === 0) {
    grid.appendChild(
      el('p', { style: { color: 'var(--text-muted)' } }, 'No hay productos disponibles en esta categoría.')
    );
    return;
  }

  for (const prod of filtered) {
    const img = el('img', {
      src: resolveAssetUrl(prod.imagen_url) || buildSvgDataUri(prod.nombre),
      alt: prod.nombre,
      className: 'product-img'
    });
    attachImageFallback(img, prod.nombre);

    const card = el('article', { className: 'card' }, [
      img,
      el('div', { className: 'card-body' }, [
        el(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.45rem' } },
          [
            el('span', { className: `badge badge-${prod.estado}` }, prod.estado),
            el(
              'span',
              { className: 'stars' },
              `★ ${Number(prod.promedio_estrellas || 0).toFixed(1)} (${prod.total_resenas})`
            )
          ]
        ),
        el('h3', {}, prod.nombre),
        el('p', { className: 'product-desc', title: prod.descripcion }, prod.descripcion),
        el(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.45rem',
              marginTop: 'auto',
              paddingTop: '0.35rem'
            }
          },
          [
            el(
              'span',
              { className: 'price-tag', style: { fontSize: '1.25rem', color: 'var(--color-primary)' } },
              formatCurrency(prod.precio_venta)
            ),
            el(
              'a',
              {
                href: isAuthenticated() ? '#portal' : '#login',
                className: 'btn btn-primary btn-sm'
              },
              isAuthenticated() ? 'Ordenar' : 'Pedir'
            )
          ]
        )
      ])
    ]);
    grid.appendChild(card);
  }
  animateStaggerCards(grid, '.card');
}

function populateHomeEvents(host) {
  clearContainer(host);
  host.appendChild(renderCardlessEventsShowcase(appState.events, { mode: 'public' }));
}

/* ==========================================================================
   2. LOGIN Y REGISTRO (Validaciones de correo, contraseña, nombre y edad)
   ========================================================================== */
function renderLoginView(root) {
  clearContainer(root);

  const correoInput = el('input', {
    id: 'login-correo',
    name: 'correo',
    type: 'email',
    className: 'form-control',
    placeholder: 'ejemplo@correo.com',
    'aria-invalid': 'false',
    required: 'true'
  });

  const passwordInput = el('input', {
    id: 'login-password',
    name: 'password',
    type: 'password',
    className: 'form-control',
    placeholder: '••••••••',
    'aria-invalid': 'false',
    required: 'true'
  });

  const rememberInput = el('input', {
    id: 'login-remember',
    type: 'checkbox',
    checked: 'true'
  });

  const submitBtn = el(
    'button',
    { type: 'submit', className: 'btn btn-primary', style: { width: '100%' } },
    'Ingresar a SazónYA'
  );

  const form = el(
    'form',
    {
      novalidate: 'true',
      onSubmit: async (e) => {
        e.preventDefault();
        applyFormErrors(form, []);
        const correo = correoInput.value.trim();
        const password = passwordInput.value;

        const localErrors = [];
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
          localErrors.push({ field: 'correo', message: 'Ingresa un correo electrónico válido.' });
        }
        if (!password || password.length < 4) {
          localErrors.push({ field: 'password', message: 'La contraseña es obligatoria.' });
        }
        if (localErrors.length > 0) {
          applyFormErrors(form, localErrors);
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Verificando credenciales...';
        try {
          const res = await apiRequest('/auth/login', {
            method: 'POST',
            body: { correo, password }
          });
          saveSession({
            user: res.data.user,
            token: res.data.token,
            remember: rememberInput.checked
          });
          showNotification(res.message, 'success');
          navigate(res.data.user.rol === ROLES.ADMIN ? 'admin' : 'portal');
        } catch (err) {
          showNotification(err.message, 'error');
          applyFormErrors(form, err.errors || []);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Ingresar a SazónYA';
        }
      }
    },
    [
      el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label', for: 'login-correo' }, 'Correo Electrónico'),
        correoInput,
        el('span', { className: 'field-error', 'data-error-for': 'correo' })
      ]),
      el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label', for: 'login-password' }, 'Contraseña'),
        passwordInput,
        el('span', { className: 'field-error', 'data-error-for': 'password' })
      ]),
      el(
        'div',
        { className: 'form-group', style: { flexDirection: 'row', alignItems: 'center', gap: '0.5rem' } },
        [
          rememberInput,
          el('label', { for: 'login-remember', style: { fontSize: '0.88rem' } }, 'Mantener mi sesión iniciada')
        ]
      ),
      submitBtn
    ]
  );

  const card = el(
    'div',
    { className: 'card', style: { maxWidth: '520px', margin: '2rem auto' } },
    [
      el('div', { className: 'card-body' }, [
        el('h2', { style: { color: 'var(--color-primary)' } }, 'Iniciar Sesión en SazónYA'),
        el(
          'p',
          { style: { color: 'var(--text-muted)', fontSize: '0.92rem' } },
          'Ingresa con tu correo electrónico y contraseña para realizar pedidos, calificar productos o administrar el inventario.'
        ),
        form,
        el(
          'div',
          {
            style: {
              marginTop: '0.9rem',
              paddingTop: '0.9rem',
              borderTop: '1px solid var(--border-subtle)'
            }
          },
          [
            el(
              'p',
              { style: { fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' } },
              'Accesos directos de demostración:'
            ),
            el('div', { style: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } }, [
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline',
                  style: { fontSize: '0.8rem' },
                  onClick: () => {
                    correoInput.value = 'admin@sazonya.com';
                    passwordInput.value = 'Admin123!';
                    animatePulse(correoInput);
                  }
                },
                'Autocompletar Admin'
              ),
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline',
                  style: { fontSize: '0.8rem' },
                  onClick: () => {
                    correoInput.value = 'camila@cliente.com';
                    passwordInput.value = 'Cliente123!';
                    animatePulse(correoInput);
                  }
                },
                'Autocompletar Cliente'
              )
            ])
          ]
        ),
        el('p', { style: { textAlign: 'center', fontSize: '0.9rem', marginTop: '0.6rem' } }, [
          '¿Aún no tienes cuenta? ',
          el(
            'a',
            { href: '#register', style: { color: 'var(--color-primary)', fontWeight: '700' } },
            'Regístrate aquí'
          )
        ])
      ])
    ]
  );

  root.appendChild(card);
  animateStaggerCards(root, '.card');
}

function renderRegisterView(root) {
  clearContainer(root);

  const nombreInput = el('input', {
    id: 'reg-nombre',
    name: 'nombre',
    type: 'text',
    className: 'form-control',
    placeholder: 'Ej: Valeria Gómez',
    'aria-invalid': 'false',
    required: 'true'
  });

  const edadInput = el('input', {
    id: 'reg-edad',
    name: 'edad',
    type: 'number',
    min: '13',
    max: '120',
    value: '22',
    className: 'form-control',
    'aria-invalid': 'false',
    required: 'true'
  });

  const correoInput = el('input', {
    id: 'reg-correo',
    name: 'correo',
    type: 'email',
    className: 'form-control',
    placeholder: 'valeria@correo.com',
    'aria-invalid': 'false',
    required: 'true'
  });

  const passwordInput = el('input', {
    id: 'reg-password',
    name: 'password',
    type: 'password',
    className: 'form-control',
    placeholder: 'Mín. 8 caracteres (Mayúscula, minúscula, número y símbolo)',
    'aria-invalid': 'false',
    required: 'true'
  });

  const submitBtn = el(
    'button',
    { type: 'submit', className: 'btn btn-primary', style: { width: '100%' } },
    'Registrarme y Entrar'
  );

  const form = el(
    'form',
    {
      novalidate: 'true',
      onSubmit: async (e) => {
        e.preventDefault();
        applyFormErrors(form, []);

        const nombre = nombreInput.value.trim();
        const edad = Number(edadInput.value);
        const correo = correoInput.value.trim();
        const password = passwordInput.value;

        const errors = [];
        if (!nombre || nombre.length < 2) {
          errors.push({ field: 'nombre', message: 'El nombre debe tener al menos 2 caracteres.' });
        }
        if (!Number.isInteger(edad) || edad < 13 || edad > 120) {
          errors.push({ field: 'edad', message: 'La edad debe estar entre 13 y 120 años.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
          errors.push({ field: 'correo', message: 'Ingresa un correo electrónico válido.' });
        }
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/.test(password)) {
          errors.push({
            field: 'password',
            message: 'Mínimo 8 caracteres con mayúscula, minúscula, número y carácter especial.'
          });
        }

        if (errors.length > 0) {
          applyFormErrors(form, errors);
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando cuenta...';
        try {
          const res = await apiRequest('/auth/register', {
            method: 'POST',
            body: { nombre, edad, correo, password }
          });
          saveSession({ user: res.data.user, token: res.data.token, remember: true });
          showNotification(res.message, 'success');
          navigate('portal');
        } catch (err) {
          showNotification(err.message, 'error');
          applyFormErrors(form, err.errors || []);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Registrarme y Entrar';
        }
      }
    },
    [
      el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label', for: 'reg-nombre' }, 'Nombre Completo'),
        nombreInput,
        el('span', { className: 'field-error', 'data-error-for': 'nombre' })
      ]),
      el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label', for: 'reg-edad' }, 'Edad (13 a 120 años)'),
        edadInput,
        el('span', { className: 'field-error', 'data-error-for': 'edad' })
      ]),
      el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label', for: 'reg-correo' }, 'Correo Electrónico'),
        correoInput,
        el('span', { className: 'field-error', 'data-error-for': 'correo' })
      ]),
      el('div', { className: 'form-group' }, [
        el('label', { className: 'form-label', for: 'reg-password' }, 'Contraseña Segura'),
        passwordInput,
        el('span', { className: 'field-error', 'data-error-for': 'password' })
      ]),
      submitBtn
    ]
  );

  const card = el(
    'div',
    { className: 'card', style: { maxWidth: '550px', margin: '2rem auto' } },
    [
      el('div', { className: 'card-body' }, [
        el('h2', { style: { color: 'var(--color-primary)' } }, 'Crear Cuenta en SazónYA'),
        el(
          'p',
          { style: { color: 'var(--text-muted)', fontSize: '0.92rem' } },
          'Regístrate con tu nombre, edad, correo electrónico y contraseña para realizar pedidos, guardar favoritos y participar en sorteos.'
        ),
        form,
        el('p', { style: { textAlign: 'center', fontSize: '0.9rem', marginTop: '0.6rem' } }, [
          '¿Ya tienes cuenta? ',
          el(
            'a',
            { href: '#login', style: { color: 'var(--color-primary)', fontWeight: '700' } },
            'Inicia sesión'
          )
        ])
      ])
    ]
  );

  root.appendChild(card);
  animateStaggerCards(root, '.card');
}

/* ==========================================================================
   3. PORTAL DEL CLIENTE (Pedidos, Favoritos, Estrellas/Reseñas, Recomendar, Sorteos)
   ========================================================================== */
async function loadPortalData() {
  const [prodRes, favRes, revRes, recRes, evRes, ordRes] = await Promise.all([
    apiRequest('/products'),
    apiRequest('/favorites'),
    apiRequest('/reviews'),
    apiRequest('/recommendations'),
    apiRequest('/events?onlyActive=true'),
    apiRequest('/orders/my')
  ]);
  appState.products = prodRes.data.products || [];
  appState.favorites = favRes.data.favorites || [];
  appState.reviews = revRes.data.reviews || [];
  appState.recommendations = recRes.data.recommendations || [];
  appState.events = evRes.data.events || [];
  appState.myOrders = ordRes.data.orders || [];
}

async function renderUserPortalView(root) {
  if (!isAuthenticated()) {
    navigate('login');
    return;
  }
  clearContainer(root);

  try {
    await loadPortalData();
  } catch (err) {
    showNotification(err.message, 'error');
  }

  const tabs = [
    { id: 'pedidos', label: '🍔 Pedidos' },
    { id: 'favoritos', label: '❤️ Favoritos' },
    { id: 'resenas', label: '★ Reseñas' },
    { id: 'recomendar', label: '💡 Sugerir' },
    { id: 'eventos', label: '🎟️ Eventos' }
  ];

  const tabBar = el('div', { style: { display: 'flex', gap: '0.45rem', flexWrap: 'wrap' } });
  const contentArea = el('div', { id: 'portal-tab-content' });

  function drawTabs() {
    clearContainer(tabBar);
    for (const t of tabs) {
      tabBar.appendChild(
        el(
          'button',
          {
            type: 'button',
            className: `btn btn-sm ${appState.userTab === t.id ? 'btn-primary' : 'btn-outline'}`,
            onClick: () => {
              appState.userTab = t.id;
              drawTabs();
              drawActivePortalTab(contentArea);
            }
          },
          t.label
        )
      );
    }
  }

  root.appendChild(
    el(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '1.25rem 0 1rem',
          flexWrap: 'wrap',
          gap: '0.85rem'
        }
      },
      [
        el('div', {}, [
          el('h1', { style: { color: 'var(--color-primary)' } }, `Hola, ${sessionState.user?.nombre}`),
          el('p', { style: { color: 'var(--text-muted)', fontSize: '0.9rem' } }, 'Pedidos, favoritos, reseñas y sorteos.')
        ]),
        tabBar
      ]
    )
  );

  root.appendChild(contentArea);
  drawTabs();
  drawActivePortalTab(contentArea);
}

function isProductFavorite(productId) {
  return appState.favorites.some((f) => f.id === Number(productId));
}

function addToCart(prod) {
  const existing = appState.cart.find((i) => i.producto_id === prod.id);
  if (existing) {
    if (existing.cantidad < prod.stock_actual) {
      existing.cantidad += 1;
    }
  } else {
    appState.cart.push({
      producto_id: prod.id,
      nombre: prod.nombre,
      precio_venta: prod.precio_venta,
      stock_max: prod.stock_actual,
      cantidad: 1
    });
  }
}

function drawActivePortalTab(container) {
  clearContainer(container);

  if (appState.userTab === 'pedidos') {
    const menuGrid = el('div', { className: 'portal-menu-grid' });
    for (const prod of appState.products) {
      const img = el('img', {
        src: resolveAssetUrl(prod.imagen_url) || buildSvgDataUri(prod.nombre),
        alt: prod.nombre,
        className: 'product-img'
      });
      attachImageFallback(img, prod.nombre);

      const isFav = isProductFavorite(prod.id);
      const favBtn = el(
        'button',
        {
          type: 'button',
          className: 'btn btn-outline btn-sm',
          'aria-label': isFav ? `Quitar ${prod.nombre} de favoritos` : `Agregar ${prod.nombre} a favoritos`,
          onClick: async () => {
            try {
              const res = await apiRequest(`/favorites/${prod.id}/toggle`, { method: 'POST' });
              showNotification(res.message, 'success');
              await loadPortalData();
              drawActivePortalTab(container);
            } catch (err) {
              showNotification(err.message, 'error');
            }
          }
        },
        isFav ? '❤️' : '🤍'
      );

      const addBtn = el(
        'button',
        {
          type: 'button',
          className: 'btn btn-primary btn-sm',
          disabled:
            prod.estado === 'AGOTADO' || prod.estado === 'INACTIVO' || prod.stock_actual <= 0
              ? 'true'
              : null,
          onClick: () => {
            addToCart(prod);
            animatePulse(addBtn);
            drawActivePortalTab(container);
          }
        },
        prod.stock_actual > 0 ? '+ Agregar' : 'Agotado'
      );

      menuGrid.appendChild(
        el('article', { className: 'card card-compact' }, [
          img,
          el('div', { className: 'card-body' }, [
            el(
              'div',
              { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' } },
              [
                el('span', { className: `badge badge-${prod.estado}` }, prod.estado),
                favBtn
              ]
            ),
            el('h4', {}, prod.nombre),
            el('p', { className: 'card-desc-clamp', title: prod.descripcion }, prod.descripcion),
            el('div', { className: 'card-footer-compact' }, [
              el('div', {}, [
                el(
                  'strong',
                  { className: 'price-tag', style: { color: 'var(--color-primary)', fontSize: '1.05rem', display: 'block' } },
                  formatCurrency(prod.precio_venta)
                ),
                el('span', { style: { fontSize: '0.72rem', color: 'var(--text-muted)' } }, `Stock: ${prod.stock_actual}`)
              ]),
              addBtn
            ])
          ])
        ])
      );
    }

    // Carrito compacto
    const cartCardBody = el('div', { className: 'card-body' }, [
      el('h3', { style: { color: 'var(--color-primary)' } }, '🛒 Tu Pedido')
    ]);

    if (appState.cart.length === 0) {
      cartCardBody.appendChild(
        el('p', { style: { color: 'var(--text-muted)', fontSize: '0.88rem' } }, 'Agrega productos del menú.')
      );
    } else {
      for (const item of appState.cart) {
        cartCardBody.appendChild(
          el(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.45rem',
                padding: '0.5rem 0',
                borderBottom: '1px solid var(--border-subtle)'
              }
            },
            [
              el('div', {}, [
                el('strong', { style: { fontSize: '0.9rem' } }, item.nombre),
                el('div', { style: { fontSize: '0.78rem', color: 'var(--text-muted)' } }, `${formatCurrency(item.precio_venta)} c/u`)
              ]),
              el('div', { style: { display: 'flex', alignItems: 'center', gap: '0.4rem' } }, [
                el(
                  'button',
                  {
                    type: 'button',
                    className: 'btn btn-outline btn-sm',
                    onClick: () => {
                      item.cantidad -= 1;
                      if (item.cantidad <= 0) {
                        appState.cart = appState.cart.filter((c) => c.producto_id !== item.producto_id);
                      }
                      drawActivePortalTab(container);
                    }
                  },
                  '-'
                ),
                el('strong', {}, String(item.cantidad)),
                el(
                  'button',
                  {
                    type: 'button',
                    className: 'btn btn-outline btn-sm',
                    onClick: () => {
                      if (item.cantidad < item.stock_max) {
                        item.cantidad += 1;
                        drawActivePortalTab(container);
                      }
                    }
                  },
                  '+'
                )
              ])
            ]
          )
        );
      }

      const notesInput = el('input', {
        type: 'text',
        className: 'form-control',
        placeholder: 'Sin cebolla, extra salsa...'
      });

      const total = appState.cart.reduce((acc, i) => acc + i.precio_venta * i.cantidad, 0);

      cartCardBody.appendChild(
        el('div', { className: 'form-group', style: { marginTop: '0.65rem', marginBottom: '0.5rem' } }, [
          el('label', { className: 'form-label' }, 'Notas (opcional)'),
          notesInput
        ])
      );

      cartCardBody.appendChild(
        el(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.45rem', margin: '0.5rem 0' } },
          [
            el('span', {}, 'Total:'),
            el(
              'strong',
              { className: 'price-tag', style: { fontSize: '1.3rem', color: 'var(--color-primary)' } },
              formatCurrency(total)
            )
          ]
        )
      );

      cartCardBody.appendChild(
        el(
          'button',
          {
            type: 'button',
            className: 'btn btn-primary',
            style: { width: '100%' },
            onClick: async () => {
              try {
                const res = await apiRequest('/orders', {
                  method: 'POST',
                  body: {
                    items: appState.cart.map((c) => ({
                      producto_id: c.producto_id,
                      cantidad: c.cantidad
                    })),
                    notas_entrega: notesInput.value.trim()
                  }
                });
                appState.cart = [];
                showNotification(res.message, 'success');
                await loadPortalData();
                drawActivePortalTab(container);
              } catch (err) {
                showNotification(err.message, 'error');
              }
            }
          },
          'Confirmar Pedido'
        )
      );
    }

    const ordersCardBody = el('div', { className: 'card-body' }, [el('h3', {}, 'Pedidos Recientes')]);
    if (appState.myOrders.length === 0) {
      ordersCardBody.appendChild(el('p', { style: { color: 'var(--text-muted)', fontSize: '0.88rem' } }, 'Sin pedidos aún.'));
    } else {
      for (const ord of appState.myOrders) {
        ordersCardBody.appendChild(
          el(
            'div',
            { style: { padding: '0.55rem 0', borderBottom: '1px solid var(--border-subtle)' } },
            [
              el(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' } },
                [
                  el('strong', { style: { fontSize: '0.9rem' } }, `Pedido #${ord.id}`),
                  el('span', { className: 'badge badge-DISPONIBLE' }, ord.estado)
                ]
              ),
              el(
                'p',
                { style: { fontSize: '0.82rem', color: 'var(--text-muted)' } },
                `Total: ${formatCurrency(ord.total_venta)}${ord.notas_entrega ? ` · "${ord.notas_entrega}"` : ''}`
              )
            ]
          )
        );
      }
    }

    container.appendChild(
      el('div', { className: 'portal-orders-layout' }, [
        el('div', {}, [el('h2', { style: { marginBottom: '0.85rem' } }, 'Menú Disponible'), menuGrid]),
        el('div', { className: 'portal-sidebar' }, [
          el('div', { className: 'card', style: { marginBottom: '1.1rem' } }, [cartCardBody]),
          el('div', { className: 'card' }, [ordersCardBody])
        ])
      ])
    );
  } else if (appState.userTab === 'favoritos') {
    container.appendChild(el('h2', { style: { marginBottom: '0.85rem' } }, '❤️ Mis Favoritos'));
    if (appState.favorites.length === 0) {
      container.appendChild(
        el('div', { className: 'card card-body' }, 'Aún no tienes favoritos. Marca productos con ❤️ desde el menú.')
      );
    } else {
      const grid = el('div', { className: 'portal-menu-grid' });
      for (const fav of appState.favorites) {
        const img = el('img', {
          src: resolveAssetUrl(fav.imagen_url) || buildSvgDataUri(fav.nombre),
          alt: fav.nombre,
          className: 'product-img'
        });
        attachImageFallback(img, fav.nombre);

        grid.appendChild(
          el('article', { className: 'card card-compact' }, [
            img,
            el('div', { className: 'card-body' }, [
              el(
                'div',
                { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' } },
                [
                  el('span', { className: `badge badge-${fav.estado}` }, fav.estado),
                  el('span', { className: 'stars', style: { fontSize: '0.84rem' } }, `★ ${Number(fav.promedio_estrellas || 0).toFixed(1)}`)
                ]
              ),
              el('h3', {}, fav.nombre),
              el('p', { className: 'card-desc-clamp', title: fav.descripcion }, fav.descripcion),
              el('div', { className: 'card-footer-compact' }, [
                el(
                  'strong',
                  { className: 'price-tag', style: { color: 'var(--color-primary)' } },
                  formatCurrency(fav.precio_venta)
                ),
                el('div', { style: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap' } }, [
                  el(
                    'button',
                    {
                      type: 'button',
                      className: 'btn btn-outline btn-sm',
                      onClick: async () => {
                        const res = await apiRequest(`/favorites/${fav.id}/toggle`, { method: 'POST' });
                        showNotification(res.message, 'success');
                        await loadPortalData();
                        drawActivePortalTab(container);
                      }
                    },
                    'Quitar'
                  ),
                  el(
                    'button',
                    {
                      type: 'button',
                      className: 'btn btn-primary btn-sm',
                      onClick: () => {
                        addToCart(fav);
                        appState.userTab = 'pedidos';
                        drawActivePortalTab(container);
                      }
                    },
                    'Pedir'
                  )
                ])
              ])
            ])
          ])
        );
      }
      container.appendChild(grid);
    }
  } else if (appState.userTab === 'resenas') {
    let selectedStars = 5;
    const prodSelect = el(
      'select',
      { className: 'form-control' },
      appState.products.map((p) => el('option', { value: String(p.id) }, p.nombre))
    );
    const starsWrap = el('div', { className: 'stars-picker' });
    const commentArea = el('textarea', {
      rows: '3',
      className: 'form-control',
      placeholder: 'Cuéntanos sobre el sabor y las salsas...',
      required: 'true'
    });

    function renderStarButtons() {
      clearContainer(starsWrap);
      for (const s of [1, 2, 3, 4, 5]) {
        const starBtn = el(
          'button',
          {
            type: 'button',
            className: `btn btn-sm ${selectedStars >= s ? 'btn-secondary' : 'btn-outline'}`,
            onClick: () => {
              selectedStars = s;
              renderStarButtons();
              animatePulse(starsWrap);
            }
          },
          `★ ${s}`
        );
        starsWrap.appendChild(starBtn);
      }
    }
    renderStarButtons();

    const reviewForm = el(
      'form',
      {
        onSubmit: async (e) => {
          e.preventDefault();
          try {
            const res = await apiRequest('/reviews', {
              method: 'POST',
              body: {
                producto_id: Number(prodSelect.value),
                estrellas: selectedStars,
                comentario: commentArea.value.trim()
              }
            });
            commentArea.value = '';
            showNotification(res.message, 'success');
            await loadPortalData();
            drawActivePortalTab(container);
          } catch (err) {
            showNotification(err.message, 'error');
          }
        }
      },
      [
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label' }, 'Producto'),
          prodSelect
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label' }, 'Calificación'),
          starsWrap
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label' }, 'Reseña'),
          commentArea
        ]),
        el('button', { type: 'submit', className: 'btn btn-primary btn-sm' }, 'Guardar Reseña')
      ]
    );

    const reviewsList = el('div', { className: 'card-body' }, [el('h3', {}, 'Reseñas Recientes')]);
    for (const rev of appState.reviews) {
      reviewsList.appendChild(
        el(
          'div',
          { style: { padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' } },
          [
            el(
              'div',
              { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' } },
              [
                el('strong', {}, rev.producto_nombre),
                el('span', { className: 'stars' }, `${'★'.repeat(rev.estrellas)} (${rev.estrellas}/5)`)
              ]
            ),
            el('p', { style: { fontSize: '0.88rem', margin: '0.2rem 0' } }, `"${rev.comentario}"`),
            el('small', { style: { color: 'var(--text-muted)' } }, `Por ${rev.usuario_nombre}`)
          ]
        )
      );
    }

    container.appendChild(
      el('div', { className: 'grid-2' }, [
        el('div', { className: 'card' }, [
          el('div', { className: 'card-body' }, [
            el('h3', { style: { color: 'var(--color-primary)' } }, '★ Calificar Producto'),
            reviewForm
          ])
        ]),
        el('div', { className: 'card' }, [reviewsList])
      ])
    );
  } else if (appState.userTab === 'recomendar') {
    const nameInput = el('input', {
      type: 'text',
      className: 'form-control',
      placeholder: 'Ej: Burger Costilla BBQ',
      required: 'true'
    });
    const descInput = el('textarea', {
      rows: '3',
      className: 'form-control',
      placeholder: 'Ingredientes y preparación (mín. 15 caracteres)...',
      required: 'true'
    });

    const recForm = el(
      'form',
      {
        onSubmit: async (e) => {
          e.preventDefault();
          try {
            const res = await apiRequest('/recommendations', {
              method: 'POST',
              body: {
                nombre_sugerido: nameInput.value.trim(),
                descripcion_ingredientes: descInput.value.trim()
              }
            });
            nameInput.value = '';
            descInput.value = '';
            showNotification(res.message, 'success');
            await loadPortalData();
            drawActivePortalTab(container);
          } catch (err) {
            showNotification(err.message, 'error');
          }
        }
      },
      [
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label' }, 'Nombre Sugerido'),
          nameInput
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label' }, 'Ingredientes'),
          descInput
        ]),
        el('button', { type: 'submit', className: 'btn btn-primary btn-sm' }, 'Enviar Sugerencia')
      ]
    );

    const recList = el('div', { className: 'card-body' }, [el('h3', {}, 'Sugerencias')]);
    for (const rec of appState.recommendations) {
      recList.appendChild(
        el(
          'div',
          { style: { padding: '0.6rem 0', borderBottom: '1px solid var(--border-subtle)' } },
          [
            el(
              'div',
              { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' } },
              [
                el('strong', {}, rec.nombre_sugerido),
                el('span', { className: `badge badge-${rec.estado}` }, rec.estado)
              ]
            ),
            el(
              'p',
              { style: { fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '0.2rem' } },
              rec.descripcion_ingredientes
            )
          ]
        )
      );
    }

    container.appendChild(
      el('div', { className: 'grid-2' }, [
        el('div', { className: 'card' }, [
          el('div', { className: 'card-body' }, [
            el('h3', { style: { color: 'var(--color-primary)' } }, '💡 Sugerir Producto'),
            recForm
          ])
        ]),
        el('div', { className: 'card' }, [recList])
      ])
    );
  } else if (appState.userTab === 'eventos') {
    container.appendChild(el('h2', { style: { marginBottom: '0.85rem' } }, '🎉 Eventos y Sorteos'));
    container.appendChild(
      renderCardlessEventsShowcase(appState.events, {
        mode: 'portal',
        onParticipate: async (ev) => {
          try {
            const res = await apiRequest(`/events/${ev.id}/participate`, { method: 'POST' });
            showNotification(res.message, 'success');
            await loadPortalData();
            drawActivePortalTab(container);
          } catch (err) {
            showNotification(err.message, 'error');
          }
        }
      })
    );
  }

  animateStaggerCards(container, '.card');
}

/* ==========================================================================
   4. PANEL ADMINISTRADOR (Estadísticas Semanales, CRUD Productos, Condimentos, Eventos)
   ========================================================================== */
async function loadAdminData() {
  const [statsRes, prodRes, condRes, evRes, recRes] = await Promise.all([
    apiRequest('/analytics/weekly'),
    apiRequest('/products?includeInactive=true'),
    apiRequest('/condiments'),
    apiRequest('/events'),
    apiRequest('/recommendations')
  ]);
  appState.weeklyStats = statsRes.data;
  appState.products = prodRes.data.products || [];
  appState.categories = prodRes.data.categories || [];
  appState.condiments = condRes.data.condiments || [];
  appState.events = evRes.data.events || [];
  appState.recommendations = recRes.data.recommendations || [];
}

async function renderAdminDashboardView(root) {
  if (!isAdmin()) {
    navigate(isAuthenticated() ? 'portal' : 'login');
    return;
  }
  revokeAllAdminPreviewUrls();
  clearContainer(root);

  try {
    await loadAdminData();
  } catch (err) {
    showNotification(err.message, 'error');
  }

  const adminTabs = [
    { id: 'estadisticas', label: '📈 Estadísticas Semanales' },
    { id: 'productos', label: '🍔 CRUD Productos' },
    { id: 'condimentos', label: '🥫 Inventario Condimentos' },
    { id: 'eventos', label: '🎉 Eventos y Recomendaciones' }
  ];

  const tabBar = el('div', { style: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } });
  const contentArea = el('div', { id: 'admin-tab-content' });

  function drawTabs() {
    clearContainer(tabBar);
    for (const t of adminTabs) {
      tabBar.appendChild(
        el(
          'button',
          {
            type: 'button',
            className: `btn btn-sm ${appState.adminTab === t.id ? 'btn-primary' : 'btn-outline'}`,
            onClick: () => {
              appState.adminTab = t.id;
              drawTabs();
              drawActiveAdminTab(contentArea);
            }
          },
          t.label
        )
      );
    }
  }

  root.appendChild(
    el(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '1.5rem 0 1.25rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }
      },
      [
        el('div', {}, [
          el('h1', { style: { color: 'var(--color-primary)' } }, 'Panel de Administración SazónYA'),
          el(
            'p',
            { style: { color: 'var(--text-muted)' } },
            'Estadísticas de ventas semanales, CRUD de productos, estados de inventario de condimentos y registro de eventos.'
          )
        ]),
        tabBar
      ]
    )
  );

  root.appendChild(contentArea);
  drawTabs();
  drawActiveAdminTab(contentArea);
}

function drawActiveAdminTab(container) {
  revokeAllAdminPreviewUrls();
  clearContainer(container);

  if (appState.adminTab === 'estadisticas') {
    const stats = appState.weeklyStats || {};
    const topProd = stats.producto_mas_vendido;
    const netProfitNode = el('h2', { style: { color: 'var(--status-success)' } }, '$0.00');
    const alertsCountNode = el('h2', { style: { color: 'var(--color-accent)' } }, '0 Alertas Activas');

    const kpiGrid = el('div', { className: 'grid-3', style: { marginBottom: '1.5rem' } }, [
      el('div', { className: 'card card-body', style: { borderLeft: '5px solid var(--color-primary)' } }, [
        el('small', { style: { color: 'var(--text-muted)', fontWeight: '700' } }, 'PRODUCTO MÁS VENDIDO (SEMANA)'),
        el('h2', { style: { color: 'var(--color-primary)' } }, topProd ? topProd.producto_nombre : 'Sin ventas'),
        el(
          'p',
          { style: { fontSize: '0.92rem' } },
          `Unidades vendidas: ${topProd?.unidades_vendidas || 0} · Ganancia: ${formatCurrency(topProd?.ganancia_neta || 0)}`
        )
      ]),
      el('div', { className: 'card card-body', style: { borderLeft: '5px solid var(--status-success)' } }, [
        el('small', { style: { color: 'var(--text-muted)', fontWeight: '700' } }, 'GANANCIA NETA SEMANAL TOTAL'),
        netProfitNode,
        el(
          'p',
          { style: { fontSize: '0.92rem' } },
          `Ingresos brutos: ${formatCurrency(stats.resumen_global?.ingresos_semanales || 0)} · Pedidos: ${stats.resumen_global?.total_pedidos_entregados || 0}`
        )
      ]),
      el('div', { className: 'card card-body', style: { borderLeft: '5px solid var(--color-secondary)' } }, [
        el('small', { style: { color: 'var(--text-muted)', fontWeight: '700' } }, 'ALERTAS DE INVENTARIO'),
        alertsCountNode,
        el(
          'p',
          { style: { fontSize: '0.92rem' } },
          'Productos o condimentos en STOCK_BAJO o AGOTADO.'
        )
      ])
    ]);

    const tbody = el('tbody');
    for (const [idx, row] of (stats.ganancias_por_producto || []).entries()) {
      tbody.appendChild(
        el('tr', {}, [
          el('td', {}, [
            idx === 0
              ? el('span', { className: 'badge badge-ACTIVO' }, '#1 Más Vendido')
              : el('span', {}, `#${idx + 1}`)
          ]),
          el('td', {}, [el('strong', {}, row.producto_nombre)]),
          el('td', {}, row.categoria_nombre),
          el('td', {}, [el('strong', {}, String(row.unidades_vendidas))]),
          el('td', {}, formatCurrency(row.ingresos_totales)),
          el('td', {}, formatCurrency(row.costo_total)),
          el(
            'td',
            { style: { color: 'var(--status-success)', fontWeight: '700' } },
            formatCurrency(row.ganancia_neta)
          ),
          el('td', {}, `${row.margen_porcentaje}%`)
        ])
      );
    }

    container.appendChild(kpiGrid);
    container.appendChild(createWeeklyLineChart(stats));
    container.appendChild(
      el('div', { className: 'card' }, [
        el('div', { className: 'card-body' }, [
          el('h3', {}, '📊 Ganancias y Unidades Vendidas por Producto (Últimos 7 Días)'),
          el('div', { className: 'table-wrap' }, [
            el('table', {}, [
              el('thead', {}, [
                el('tr', {}, [
                  el('th', {}, 'Ranking'),
                  el('th', {}, 'Producto'),
                  el('th', {}, 'Categoría'),
                  el('th', {}, 'Unidades Vendidas'),
                  el('th', {}, 'Ingresos Venta'),
                  el('th', {}, 'Costo Total'),
                  el('th', {}, 'Ganancia Neta'),
                  el('th', {}, 'Margen %')
                ])
              ]),
              tbody
            ])
          ])
        ])
      ])
    );

    // Animar contadores numéricos en JavaScript (60 FPS)
    animateCounter(netProfitNode, stats.resumen_global?.ganancia_neta_semanal || 0, {
      prefix: '$',
      decimals: 2
    });
    animateCounter(alertsCountNode, stats.alertas_inventario?.length || 0, {
      suffix: ' Alertas Activas',
      decimals: 0
    });
  } else if (appState.adminTab === 'productos') {
    const editing = appState.editingProduct;

    const catSelect = el(
      'select',
      { id: 'admin-prod-categoria', className: 'form-control', name: 'categoria_id' },
      appState.categories.map((c) =>
        el(
          'option',
          {
            value: String(c.id),
            selected: editing && editing.categoria_id === c.id ? 'true' : null
          },
          c.nombre
        )
      )
    );
    const nombreInput = el('input', {
      id: 'admin-prod-nombre',
      type: 'text',
      name: 'nombre',
      className: 'form-control',
      value: editing ? editing.nombre : '',
      placeholder: 'Ej: Burger Triple Tocineta',
      required: 'true'
    });
    const descInput = el('textarea', {
      id: 'admin-prod-descripcion',
      rows: '3',
      name: 'descripcion',
      className: 'form-control',
      placeholder: 'Ingredientes y preparación...',
      required: 'true'
    });
    descInput.value = editing ? editing.descripcion : '';

    const costoInput = el('input', {
      id: 'admin-prod-costo',
      type: 'number',
      name: 'costo_unitario',
      step: '0.01',
      min: '0',
      className: 'form-control',
      value: editing ? String(editing.costo_unitario) : '3.50',
      required: 'true'
    });
    const precioInput = el('input', {
      id: 'admin-prod-precio',
      type: 'number',
      name: 'precio_venta',
      step: '0.01',
      min: '0.1',
      className: 'form-control',
      value: editing ? String(editing.precio_venta) : '8.90',
      required: 'true'
    });
    const stockInput = el('input', {
      id: 'admin-prod-stock',
      type: 'number',
      name: 'stock_actual',
      min: '0',
      className: 'form-control',
      value: editing ? String(editing.stock_actual) : '25',
      required: 'true'
    });
    const minInput = el('input', {
      id: 'admin-prod-stock-min',
      type: 'number',
      name: 'stock_minimo',
      min: '0',
      className: 'form-control',
      value: editing ? String(editing.stock_minimo) : '5',
      required: 'true'
    });

    const initialImgSrc = resolveAssetUrl(editing?.imagen_url) || buildSvgDataUri(editing?.nombre || 'Vista Previa');
    const previewImg = el('img', {
      src: initialImgSrc,
      alt: editing?.nombre || 'Vista previa del producto',
      className: 'admin-product-preview'
    });
    attachImageFallback(previewImg, editing?.nombre || 'Producto');

    const previewMeta = el(
      'div',
      { style: { fontSize: '0.82rem', color: 'var(--text-muted)', flex: '1', minWidth: '140px', overflowWrap: 'anywhere' } },
      editing?.imagen_url ? `Imagen actual: ${editing.imagen_url}` : 'Sin archivo seleccionado (usará vista SVG por defecto).'
    );

    const imgFileInput = el('input', {
      id: 'admin-prod-imagen',
      type: 'file',
      name: 'imagen',
      accept: 'image/png,image/jpeg,image/webp,image/gif',
      className: 'form-control'
    });

    const imgUrlInput = el('input', {
      id: 'admin-prod-imagen-url',
      type: 'text',
      name: 'imagen_url',
      className: 'form-control',
      value: editing && editing.imagen_url ? editing.imagen_url : '',
      placeholder: 'https://... o /uploads/products/...'
    });

    function updateProductPreviewFromUrl() {
      if (imgFileInput.files && imgFileInput.files[0]) return;
      const typed = imgUrlInput.value.trim();
      previewImg.dataset.fallbackStage = '0';
      previewImg.src = resolveAssetUrl(typed) || buildSvgDataUri(nombreInput.value.trim() || 'Vista Previa');
      previewMeta.textContent = typed ? `URL: ${typed}` : 'Sin imagen seleccionada.';
    }

    imgFileInput.addEventListener('change', () => {
      const file = imgFileInput.files?.[0];
      if (!file) {
        revokeProductPreviewUrl();
        updateProductPreviewFromUrl();
        return;
      }
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        imgFileInput.value = '';
        showNotification('Formato no permitido. Usa PNG, JPG, WEBP o GIF.', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        imgFileInput.value = '';
        showNotification('La imagen excede el máximo de 5 MB.', 'error');
        return;
      }
      revokeProductPreviewUrl();
      activeProductPreviewUrl = URL.createObjectURL(file);
      previewImg.dataset.fallbackStage = '0';
      previewImg.src = activeProductPreviewUrl;
      previewMeta.textContent = `Archivo seleccionado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    });

    imgUrlInput.addEventListener('input', updateProductPreviewFromUrl);

    const clearFileBtn = el(
      'button',
      {
        type: 'button',
        className: 'btn btn-outline btn-sm',
        onClick: () => {
          imgFileInput.value = '';
          revokeProductPreviewUrl();
          updateProductPreviewFromUrl();
        }
      },
      'Quitar archivo'
    );

    const prodForm = el(
      'form',
      {
        onSubmit: async (e) => {
          e.preventDefault();
          try {
            const path = editing ? `/products/${editing.id}` : '/products';
            const method = editing ? 'PUT' : 'POST';
            const formData = new FormData();
            formData.append('categoria_id', String(Number(catSelect.value)));
            formData.append('nombre', nombreInput.value.trim());
            formData.append('descripcion', descInput.value.trim());
            formData.append('costo_unitario', String(Number(costoInput.value)));
            formData.append('precio_venta', String(Number(precioInput.value)));
            formData.append('stock_actual', String(Number(stockInput.value)));
            formData.append('stock_minimo', String(Number(minInput.value)));

            const selectedFile = imgFileInput.files?.[0];
            if (selectedFile) {
              formData.append('imagen', selectedFile);
            } else if (imgUrlInput.value.trim()) {
              formData.append('imagen_url', imgUrlInput.value.trim());
            }

            const res = await apiRequest(path, {
              method,
              body: formData
            });
            revokeProductPreviewUrl();
            appState.editingProduct = null;
            showNotification(res.message, 'success');
            await loadAdminData();
            drawActiveAdminTab(container);
          } catch (err) {
            showNotification(err.message, 'error');
          }
        }
      },
      [
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label', for: 'admin-prod-categoria' }, 'Categoría'),
          catSelect
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label', for: 'admin-prod-nombre' }, 'Nombre del Producto'),
          nombreInput
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label', for: 'admin-prod-descripcion' }, 'Descripción'),
          descInput
        ]),
        el('div', { className: 'form-row-2' }, [
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label', for: 'admin-prod-costo' }, 'Costo Unitario ($)'),
            costoInput
          ]),
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label', for: 'admin-prod-precio' }, 'Precio de Venta ($)'),
            precioInput
          ])
        ]),
        el('div', { className: 'form-row-2' }, [
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label', for: 'admin-prod-stock' }, 'Stock Actual'),
            stockInput
          ]),
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label', for: 'admin-prod-stock-min' }, 'Stock Mínimo'),
            minInput
          ])
        ]),
        el('div', { className: 'form-group' }, [
          el(
            'label',
            { className: 'form-label', for: 'admin-prod-imagen' },
            'Cargar Imagen desde Dispositivo (PNG/JPG/WEBP/GIF · Máx 5 MB)'
          ),
          imgFileInput
        ]),
        el('div', { className: 'image-preview-box' }, [previewImg, previewMeta, clearFileBtn]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label', for: 'admin-prod-imagen-url' }, 'O URL de Imagen (Opcional)'),
          imgUrlInput
        ]),
        el('div', { style: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap' } }, [
          el(
            'button',
            { type: 'submit', className: 'btn btn-primary' },
            editing ? 'Guardar Cambios' : 'Registrar Producto'
          ),
          editing
            ? el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline',
                  onClick: () => {
                    revokeProductPreviewUrl();
                    appState.editingProduct = null;
                    drawActiveAdminTab(container);
                  }
                },
                'Cancelar Edición'
              )
            : null
        ])
      ]
    );

    const tbody = el('tbody');
    for (const prod of appState.products) {
      const thumbImg = el('img', {
        src: resolveAssetUrl(prod.imagen_url) || buildSvgDataUri(prod.nombre),
        alt: prod.nombre,
        className: 'admin-thumb'
      });
      attachImageFallback(thumbImg, prod.nombre);

      tbody.appendChild(
        el('tr', {}, [
          el('td', {}, [
            el('div', { style: { display: 'flex', alignItems: 'center', gap: '0.65rem' } }, [
              thumbImg,
              el('div', {}, [
                el('strong', {}, prod.nombre),
                el('div', { style: { fontSize: '0.78rem', color: 'var(--text-muted)' } }, prod.categoria_nombre)
              ])
            ])
          ]),
          el('td', {}, `${formatCurrency(prod.costo_unitario)} / ${formatCurrency(prod.precio_venta)}`),
          el('td', {}, `${prod.stock_actual} (mín ${prod.stock_minimo})`),
          el('td', {}, [el('span', { className: `badge badge-${prod.estado}` }, prod.estado)]),
          el('td', {}, [
            el('div', { style: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap' } }, [
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline btn-sm',
                  onClick: () => {
                    appState.editingProduct = prod;
                    drawActiveAdminTab(container);
                  }
                },
                'Editar'
              ),
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-danger btn-sm',
                  onClick: async () => {
                    try {
                      const res = await apiRequest(`/products/${prod.id}`, { method: 'DELETE' });
                      showNotification(res.message, 'success');
                      await loadAdminData();
                      drawActiveAdminTab(container);
                    } catch (err) {
                      showNotification(err.message, 'error');
                    }
                  }
                },
                'Eliminar'
              )
            ])
          ])
        ])
      );
    }

    container.appendChild(
      el('div', { className: 'grid-2' }, [
        el('div', { className: 'card' }, [
          el('div', { className: 'card-body' }, [
            el(
              'h3',
              { style: { color: 'var(--color-primary)' } },
              editing ? `Editar Producto #${editing.id}` : 'Registrar Nuevo Producto'
            ),
            prodForm
          ])
        ]),
        el('div', { className: 'card' }, [
          el('div', { className: 'card-body' }, [
            el('h3', {}, `Inventario y Catálogo de Productos (${appState.products.length})`),
            el('div', { className: 'table-wrap' }, [
              el('table', {}, [
                el('thead', {}, [
                  el('tr', {}, [
                    el('th', {}, 'Producto'),
                    el('th', {}, 'Costo / Venta'),
                    el('th', {}, 'Stock'),
                    el('th', {}, 'Estado'),
                    el('th', {}, 'Acciones')
                  ])
                ]),
                tbody
              ])
            ])
          ])
        ])
      ])
    );
  } else if (appState.adminTab === 'condimentos') {
    const nombreInput = el('input', {
      type: 'text',
      className: 'form-control',
      placeholder: 'Ej: Salsa BBQ Bourbon',
      required: 'true'
    });
    const tipoSelect = el('select', { className: 'form-control' }, [
      el('option', { value: 'SALSA' }, 'SALSA'),
      el('option', { value: 'CONDIMENTO' }, 'CONDIMENTO'),
      el('option', { value: 'INGREDIENTE' }, 'INGREDIENTE'),
      el('option', { value: 'EMPAQUE' }, 'EMPAQUE')
    ]);
    const unidadInput = el('input', {
      type: 'text',
      className: 'form-control',
      value: 'porcion',
      required: 'true'
    });
    const stockInput = el('input', {
      type: 'number',
      min: '0',
      className: 'form-control',
      value: '50',
      required: 'true'
    });
    const minInput = el('input', {
      type: 'number',
      min: '0',
      className: 'form-control',
      value: '10',
      required: 'true'
    });

    const condForm = el(
      'form',
      {
        onSubmit: async (e) => {
          e.preventDefault();
          try {
            const res = await apiRequest('/condiments', {
              method: 'POST',
              body: {
                nombre: nombreInput.value.trim(),
                tipo: tipoSelect.value,
                unidad_medida: unidadInput.value.trim(),
                stock_actual: Number(stockInput.value),
                stock_minimo: Number(minInput.value)
              }
            });
            nombreInput.value = '';
            showNotification(res.message, 'success');
            await loadAdminData();
            drawActiveAdminTab(container);
          } catch (err) {
            showNotification(err.message, 'error');
          }
        }
      },
      [
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label' }, 'Nombre del Condimento / Salsa / Insumo'),
          nombreInput
        ]),
        el('div', { className: 'form-row-2' }, [
          el('div', { className: 'form-group' }, [el('label', { className: 'form-label' }, 'Tipo'), tipoSelect]),
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label' }, 'Unidad de Medida'),
            unidadInput
          ])
        ]),
        el('div', { className: 'form-row-2' }, [
          el('div', { className: 'form-group' }, [el('label', { className: 'form-label' }, 'Stock Actual'), stockInput]),
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label' }, 'Stock Mínimo'),
            minInput
          ])
        ]),
        el('button', { type: 'submit', className: 'btn btn-primary' }, 'Registrar en Inventario')
      ]
    );

    const tbody = el('tbody');
    for (const cond of appState.condiments) {
      tbody.appendChild(
        el('tr', {}, [
          el('td', {}, [el('strong', {}, cond.nombre)]),
          el('td', {}, cond.tipo),
          el('td', {}, `${cond.stock_actual} ${cond.unidad_medida} (mín ${cond.stock_minimo})`),
          el('td', {}, [el('span', { className: `badge badge-${cond.estado}` }, cond.estado)]),
          el('td', {}, [
            el('div', { style: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap' } }, [
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline btn-sm',
                  onClick: async () => {
                    const res = await apiRequest(`/condiments/${cond.id}`, {
                      method: 'PUT',
                      body: { stock_actual: Number(cond.stock_actual) + 20 }
                    });
                    showNotification(res.message, 'success');
                    await loadAdminData();
                    drawActiveAdminTab(container);
                  }
                },
                '+20'
              ),
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline btn-sm',
                  onClick: async () => {
                    const res = await apiRequest(`/condiments/${cond.id}`, {
                      method: 'PUT',
                      body: { stock_actual: 0 }
                    });
                    showNotification(res.message, 'success');
                    await loadAdminData();
                    drawActiveAdminTab(container);
                  }
                },
                'Agotar (0)'
              )
            ])
          ])
        ])
      );
    }

    container.appendChild(
      el('div', { className: 'grid-2' }, [
        el('div', { className: 'card' }, [
          el('div', { className: 'card-body' }, [
            el('h3', { style: { color: 'var(--color-primary)' } }, 'Registrar Nuevo Condimento o Insumo'),
            condForm
          ])
        ]),
        el('div', { className: 'card' }, [
          el('div', { className: 'card-body' }, [
            el('h3', {}, 'Estados por Condimentos e Insumos'),
            el('div', { className: 'table-wrap' }, [
              el('table', {}, [
                el('thead', {}, [
                  el('tr', {}, [
                    el('th', {}, 'Insumo / Condimento'),
                    el('th', {}, 'Tipo'),
                    el('th', {}, 'Stock Actual'),
                    el('th', {}, 'Estado'),
                    el('th', {}, 'Ajuste Rápido')
                  ])
                ]),
                tbody
              ])
            ])
          ])
        ])
      ])
    );
  } else if (appState.adminTab === 'eventos') {
    const editingEv = appState.editingEvent;

    const tituloInput = el('input', {
      id: 'admin-ev-titulo',
      type: 'text',
      className: 'form-control',
      value: editingEv ? editingEv.titulo : '',
      placeholder: 'Ej: Viernes de Papas Fritas 2x1',
      required: 'true'
    });
    const descInput = el('textarea', {
      id: 'admin-ev-descripcion',
      rows: '3',
      className: 'form-control',
      placeholder: 'Condiciones, premios o beneficios...',
      required: 'true'
    });
    descInput.value = editingEv ? editingEv.descripcion : '';

    const tipoSelect = el('select', { id: 'admin-ev-tipo', className: 'form-control' }, [
      el('option', { value: 'PROMOCION', selected: editingEv?.tipo === 'PROMOCION' ? 'true' : null }, 'PROMOCION'),
      el('option', { value: 'SORTEO', selected: editingEv?.tipo === 'SORTEO' ? 'true' : null }, 'SORTEO'),
      el('option', { value: 'EVENTO', selected: editingEv?.tipo === 'EVENTO' ? 'true' : null }, 'EVENTO')
    ]);
    const dtoInput = el('input', {
      id: 'admin-ev-descuento',
      type: 'number',
      min: '0',
      max: '100',
      value: editingEv ? String(editingEv.porcentaje_descuento ?? 0) : '15',
      className: 'form-control'
    });
    const cupoInput = el('input', {
      id: 'admin-ev-cupo',
      type: 'number',
      min: '1',
      value: editingEv?.cupo_maximo ? String(editingEv.cupo_maximo) : '50',
      className: 'form-control'
    });
    const premioInput = el('input', {
      id: 'admin-ev-premio',
      type: 'text',
      className: 'form-control',
      value: editingEv?.premio_sorteo || '',
      placeholder: 'Ej: Combo Parrillero Imperial Gratis'
    });

    const mediaTipoSelect = el('select', { id: 'admin-ev-media-tipo', className: 'form-control', name: 'media_tipo' }, [
      el('option', { value: 'NONE', selected: !editingEv?.media_tipo || editingEv.media_tipo === 'NONE' ? 'true' : null }, 'NONE (Solo texto)'),
      el('option', { value: 'VIDEO', selected: editingEv?.media_tipo === 'VIDEO' ? 'true' : null }, 'VIDEO (YouTube/Vimeo/MP4)'),
      el('option', { value: 'POSTING', selected: editingEv?.media_tipo === 'POSTING' ? 'true' : null }, 'POSTING (Publicación editorial/imagen)')
    ]);
    const mediaUrlInput = el('input', {
      id: 'admin-ev-media-url',
      type: 'text',
      name: 'media_url',
      className: 'form-control',
      value: editingEv?.media_url || '',
      placeholder: 'https://youtube.com/... o /uploads/events/...'
    });
    const mediaFileInput = el('input', {
      id: 'admin-ev-media-file',
      type: 'file',
      name: 'media_file',
      accept: 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm',
      className: 'form-control'
    });
    const postingInput = el('textarea', {
      id: 'admin-ev-posting',
      rows: '3',
      name: 'posting_contenido',
      className: 'form-control',
      placeholder: 'Texto editorial o anuncio del posting (visible sin tarjetas)...'
    });
    postingInput.value = editingEv?.posting_contenido || '';

    const livePreviewHost = el('div', { id: 'admin-event-live-preview', style: { marginTop: '1rem' } });

    function refreshLiveEventPreview() {
      clearContainer(livePreviewHost);
      const selectedFile = mediaFileInput.files?.[0];
      const draftEvent = {
        id: editingEv?.id || 0,
        titulo: tituloInput.value.trim() || 'Título del evento',
        descripcion: descInput.value.trim() || 'Descripción breve del evento.',
        tipo: tipoSelect.value,
        porcentaje_descuento: Number(dtoInput.value || 0),
        cupo_maximo: cupoInput.value ? Number(cupoInput.value) : null,
        cupos_restantes: cupoInput.value ? Number(cupoInput.value) : null,
        premio_sorteo: premioInput.value.trim() || null,
        estado: editingEv?.estado || 'ACTIVO',
        media_tipo: mediaTipoSelect.value,
        media_url: selectedFile ? null : mediaUrlInput.value.trim() || null,
        posting_contenido: postingInput.value.trim() || null
      };

      livePreviewHost.appendChild(
        el('p', { style: { fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.4rem' } }, 'Vista previa en vivo (sin tarjetas):')
      );
      livePreviewHost.appendChild(renderCardlessEventsShowcase([draftEvent], { mode: 'admin-preview' }));

      if (selectedFile && activeEventPreviewUrl) {
        const isVideo = selectedFile.type.startsWith('video/');
        livePreviewHost.appendChild(
          el('div', { style: { marginTop: '0.5rem' } }, [
            isVideo
              ? el('video', { className: 'event-media-video', src: activeEventPreviewUrl, controls: 'true', preload: 'metadata' })
              : el('img', { className: 'event-posting-img', src: activeEventPreviewUrl, alt: draftEvent.titulo })
          ])
        );
      }
    }

    mediaFileInput.addEventListener('change', () => {
      const file = mediaFileInput.files?.[0];
      if (!file) {
        revokeEventPreviewUrl();
        refreshLiveEventPreview();
        return;
      }
      const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
      if (!allowed.includes(file.type)) {
        mediaFileInput.value = '';
        showNotification('Archivo no permitido. Usa PNG/JPG/WEBP/GIF o MP4/WEBM.', 'error');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        mediaFileInput.value = '';
        showNotification('El archivo multimedia supera el máximo de 15 MB.', 'error');
        return;
      }
      revokeEventPreviewUrl();
      activeEventPreviewUrl = URL.createObjectURL(file);
      if (mediaTipoSelect.value === 'NONE') {
        mediaTipoSelect.value = file.type.startsWith('video/') ? 'VIDEO' : 'POSTING';
      }
      refreshLiveEventPreview();
    });

    for (const inputNode of [tituloInput, descInput, tipoSelect, dtoInput, cupoInput, premioInput, mediaTipoSelect, mediaUrlInput, postingInput]) {
      inputNode.addEventListener('input', refreshLiveEventPreview);
      inputNode.addEventListener('change', refreshLiveEventPreview);
    }

    const evForm = el(
      'form',
      {
        onSubmit: async (e) => {
          e.preventDefault();
          try {
            const now = new Date();
            const end = new Date(now.getTime() + 14 * 86400000);
            const path = editingEv ? `/events/${editingEv.id}` : '/events';
            const method = editingEv ? 'PUT' : 'POST';
            const selectedFile = mediaFileInput.files?.[0];

            let requestBody;
            if (selectedFile) {
              const fd = new FormData();
              fd.append('titulo', tituloInput.value.trim());
              fd.append('descripcion', descInput.value.trim());
              fd.append('tipo', tipoSelect.value);
              fd.append('porcentaje_descuento', String(Number(dtoInput.value || 0)));
              if (cupoInput.value) fd.append('cupo_maximo', String(Number(cupoInput.value)));
              if (premioInput.value.trim()) fd.append('premio_sorteo', premioInput.value.trim());
              fd.append('fecha_inicio', editingEv?.fecha_inicio || now.toISOString());
              fd.append('fecha_fin', editingEv?.fecha_fin || end.toISOString());
              fd.append('media_tipo', mediaTipoSelect.value);
              if (mediaUrlInput.value.trim()) fd.append('media_url', mediaUrlInput.value.trim());
              if (postingInput.value.trim()) fd.append('posting_contenido', postingInput.value.trim());
              fd.append('media_file', selectedFile);
              requestBody = fd;
            } else {
              requestBody = {
                titulo: tituloInput.value.trim(),
                descripcion: descInput.value.trim(),
                tipo: tipoSelect.value,
                porcentaje_descuento: Number(dtoInput.value || 0),
                cupo_maximo: cupoInput.value ? Number(cupoInput.value) : null,
                premio_sorteo: premioInput.value.trim() || null,
                fecha_inicio: editingEv?.fecha_inicio || now.toISOString(),
                fecha_fin: editingEv?.fecha_fin || end.toISOString(),
                media_tipo: mediaTipoSelect.value,
                media_url: mediaUrlInput.value.trim() || null,
                posting_contenido: postingInput.value.trim() || null
              };
            }

            const res = await apiRequest(path, {
              method,
              body: requestBody
            });
            revokeEventPreviewUrl();
            appState.editingEvent = null;
            showNotification(res.message, 'success');
            await loadAdminData();
            drawActiveAdminTab(container);
          } catch (err) {
            showNotification(err.message, 'error');
          }
        }
      },
      [
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label', for: 'admin-ev-titulo' }, 'Título del Evento o Promoción'),
          tituloInput
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label', for: 'admin-ev-descripcion' }, 'Descripción'),
          descInput
        ]),
        el('div', { className: 'form-row-3' }, [
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label', for: 'admin-ev-tipo' }, 'Tipo'),
            tipoSelect
          ]),
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label', for: 'admin-ev-descuento' }, '% Descuento'),
            dtoInput
          ]),
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label', for: 'admin-ev-cupo' }, 'Cupo Máx.'),
            cupoInput
          ])
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label', for: 'admin-ev-premio' }, 'Premio del Sorteo (Opcional)'),
          premioInput
        ]),
        el('div', { className: 'form-row-2' }, [
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label', for: 'admin-ev-media-tipo' }, 'Formato Multimedia'),
            mediaTipoSelect
          ]),
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label', for: 'admin-ev-media-url' }, 'URL de Video o Imagen'),
            mediaUrlInput
          ])
        ]),
        el('div', { className: 'form-group' }, [
          el(
            'label',
            { className: 'form-label', for: 'admin-ev-media-file' },
            'Subir Archivo Multimedia (Imagen o MP4/WEBM · Máx 15 MB)'
          ),
          mediaFileInput
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label', for: 'admin-ev-posting' }, 'Contenido del Posting (Cita o Anuncio)'),
          postingInput
        ]),
        el('div', { style: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap' } }, [
          el(
            'button',
            { type: 'submit', className: 'btn btn-primary' },
            editingEv ? 'Guardar Cambios del Evento' : 'Publicar Evento / Promoción'
          ),
          editingEv
            ? el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline',
                  onClick: () => {
                    revokeEventPreviewUrl();
                    appState.editingEvent = null;
                    drawActiveAdminTab(container);
                  }
                },
                'Cancelar Edición'
              )
            : null
        ]),
        livePreviewHost
      ]
    );
    refreshLiveEventPreview();

    const eventsList = el('div', { className: 'card-body' }, [el('h3', {}, 'Eventos y Sorteos Registrados')]);
    for (const ev of appState.events) {
      const nextEstado = ev.estado === 'ACTIVO' ? 'CANCELADO' : 'ACTIVO';
      eventsList.appendChild(
        el(
          'div',
          {
            style: {
              padding: '0.7rem 0',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }
          },
          [
            el('div', {}, [
              el('strong', {}, ev.titulo),
              el(
                'div',
                { style: { fontSize: '0.82rem', color: 'var(--text-muted)' } },
                `${ev.tipo} · ${ev.media_tipo || 'NONE'} · Inscritos: ${ev.total_inscritos || 0}`
              )
            ]),
            el('div', { style: { display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' } }, [
              el('span', { className: `badge badge-${ev.estado}` }, ev.estado),
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline btn-sm',
                  onClick: () => {
                    appState.editingEvent = ev;
                    drawActiveAdminTab(container);
                  }
                },
                'Editar'
              ),
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline btn-sm',
                  onClick: async () => {
                    try {
                      const res = await apiRequest(`/events/${ev.id}/status`, {
                        method: 'PATCH',
                        body: { estado: nextEstado }
                      });
                      showNotification(res.message, 'success');
                      await loadAdminData();
                      drawActiveAdminTab(container);
                    } catch (err) {
                      showNotification(err.message, 'error');
                    }
                  }
                },
                ev.estado === 'ACTIVO' ? 'Cancelar' : 'Reactivar'
              )
            ])
          ]
        )
      );
    }

    const recsList = el('div', { className: 'card-body' }, [
      el('h3', {}, 'Recomendaciones de Clientes para Nuevos Productos')
    ]);
    for (const rec of appState.recommendations) {
      recsList.appendChild(
        el(
          'div',
          { style: { padding: '0.7rem 0', borderBottom: '1px solid var(--border-subtle)' } },
          [
            el(
              'div',
              { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' } },
              [
                el('strong', {}, rec.nombre_sugerido),
                el('span', { className: `badge badge-${rec.estado}` }, rec.estado)
              ]
            ),
            el('p', { style: { fontSize: '0.86rem', color: 'var(--text-muted)', margin: '0.25rem 0' } }, rec.descripcion_ingredientes),
            el('div', { style: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem' } }, [
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline btn-sm',
                  onClick: async () => {
                    const res = await apiRequest(`/recommendations/${rec.id}/status`, {
                      method: 'PATCH',
                      body: { estado: 'APROBADA' }
                    });
                    showNotification(res.message, 'success');
                    await loadAdminData();
                    drawActiveAdminTab(container);
                  }
                },
                'Aprobar Idea'
              ),
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline btn-sm',
                  onClick: async () => {
                    const res = await apiRequest(`/recommendations/${rec.id}/status`, {
                      method: 'PATCH',
                      body: { estado: 'DESCARTADA' }
                    });
                    showNotification(res.message, 'success');
                    await loadAdminData();
                    drawActiveAdminTab(container);
                  }
                },
                'Descartar'
              )
            ])
          ]
        )
      );
    }

    container.appendChild(
      el('div', { className: 'grid-2' }, [
        el('div', { className: 'card' }, [
          el('div', { className: 'card-body' }, [
            el(
              'h3',
              { style: { color: 'var(--color-primary)' } },
              editingEv ? `Editar Evento #${editingEv.id}` : 'Registrar Nuevo Evento, Promoción o Sorteo'
            ),
            evForm
          ])
        ]),
        el('div', {}, [
          el('div', { className: 'card', style: { marginBottom: '1.35rem' } }, [eventsList]),
          el('div', { className: 'card' }, [recsList])
        ])
      ])
    );

    container.appendChild(
      el('section', { style: { marginTop: '2rem' } }, [
        el('h3', { style: { marginBottom: '0.65rem' } }, 'Vista Pública de Eventos (Sin Tarjetas)'),
        renderCardlessEventsShowcase(appState.events, { mode: 'admin-preview' })
      ])
    );
  }

  animateStaggerCards(container, '.card');
}

/* ==========================================================================
   5. ENRUTADOR SPA EN JAVASCRIPT PURO
   ========================================================================== */
function handleRouteChange() {
  const hash = (window.location.hash || '#home').replace(/^#/, '');
  const root = document.getElementById('app-root');
  if (!root) return;

  closeMobileNav();
  revokeAllAdminPreviewUrls();

  if (['quienes-somos', 'catalogo', 'eventos', 'contacto'].includes(hash)) {
    if (appState.route !== 'home' || !root.hasChildNodes()) {
      appState.route = 'home';
      renderNavbar();
      renderHomeView(root).then(() => {
        if (hash === 'eventos' && typeof homeTabSyncHandler === 'function') {
          homeTabSyncHandler('eventos');
        }
        const target = document.getElementById(hash);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    } else {
      if (hash === 'eventos' && typeof homeTabSyncHandler === 'function') {
        homeTabSyncHandler('eventos');
      }
      const target = document.getElementById(hash);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  }

  activeBurgerController?.destroy();
  activeBurgerController = null;
  homeTabSyncHandler = null;

  appState.route = hash || 'home';
  renderNavbar();

  if (appState.route === 'login') {
    renderLoginView(root);
  } else if (appState.route === 'register') {
    renderRegisterView(root);
  } else if (appState.route === 'portal') {
    renderUserPortalView(root);
  } else if (appState.route === 'admin') {
    renderAdminDashboardView(root);
  } else {
    appState.route = 'home';
    renderHomeView(root);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', handleRouteChange);
  onSessionChange(() => renderNavbar());
  window.addEventListener('DOMContentLoaded', handleRouteChange);
}
