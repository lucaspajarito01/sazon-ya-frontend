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
import { apiRequest } from './api.js';
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
  applyFormErrors
} from './ui.js';

const appState = {
  route: 'home',
  userTab: 'pedidos',
  adminTab: 'estadisticas',
  selectedCategory: '',
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
  editingProduct: null
};

function navigate(route) {
  window.location.hash = `#${route}`;
}

function renderNavbar() {
  const nav = document.getElementById('nav-actions');
  if (!nav) return;
  clearContainer(nav);

  const links = [
    { label: 'Vista General', hash: '#home' },
    { label: '¿Quiénes Somos?', hash: '#quienes-somos' },
    { label: 'Productos', hash: '#catalogo' },
    { label: 'Eventos', hash: '#eventos' },
    { label: 'Contacto', hash: '#contacto' }
  ];

  for (const item of links) {
    nav.appendChild(
      el(
        'a',
        {
          href: item.hash,
          className: `nav-link ${appState.route === 'home' && item.hash === '#home' ? 'active' : ''}`
        },
        item.label
      )
    );
  }

  if (!isAuthenticated()) {
    nav.appendChild(
      el('a', { href: '#login', className: 'btn btn-outline' }, 'Iniciar Sesión')
    );
    nav.appendChild(
      el('a', { href: '#register', className: 'btn btn-primary' }, 'Registrarse')
    );
  } else {
    if (isAdmin()) {
      nav.appendChild(
        el('a', { href: '#admin', className: 'btn btn-secondary' }, 'Panel Admin')
      );
    }
    const firstName = (sessionState.user?.nombre || 'Cliente').split(' ')[0];
    nav.appendChild(
      el('a', { href: '#portal', className: 'btn btn-primary' }, `Mi Portal (${firstName})`)
    );
    nav.appendChild(
      el(
        'button',
        {
          type: 'button',
          className: 'btn btn-outline',
          onClick: () => {
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
   1. VISTA GENERAL PÚBLICA (¿Quiénes somos?, Productos, Eventos, Contacto)
   ========================================================================== */
async function renderHomeView(root) {
  clearContainer(root);
  const about = CONFIG.ABOUT_INFO;

  const heroCtaGroup = el('div', { style: { display: 'flex', gap: '0.85rem', flexWrap: 'wrap' } }, [
    el('a', { href: '#catalogo', className: 'btn btn-primary' }, 'Ver Menú & Precios'),
    el('a', { href: '#eventos', className: 'btn btn-secondary' }, 'Eventos y Promociones'),
    !isAuthenticated()
      ? el(
          'a',
          {
            href: '#login',
            className: 'btn btn-outline',
            style: { color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }
          },
          'Iniciar Sesión / Registrarse'
        )
      : isAdmin()
        ? el('a', { href: '#admin', className: 'btn btn-secondary' }, 'Ir al Panel Administrador')
        : el('a', { href: '#portal', className: 'btn btn-secondary' }, 'Ir a Mi Portal de Pedidos y Sorteos')
  ]);

  const hero = el('div', { className: 'hero' }, [
    el('div', { style: { maxWidth: '740px' } }, [
      el(
        'span',
        {
          className: 'badge badge-ACTIVO',
          style: { background: '#FFB703', color: '#1D1E22', marginBottom: '0.9rem' }
        },
        'PARRILLA URBANA & COMIDA RÁPIDA'
      ),
      el('h1', {}, 'SazónYA: Hamburguesas a la Brasa, Papas Rústicas y Sabor Real'),
      el(
        'p',
        { style: { fontSize: '1.06rem', opacity: '0.92', marginBottom: '1.35rem' } },
        about.mision
      ),
      heroCtaGroup
    ])
  ]);

  const aboutSection = el(
    'section',
    { id: 'quienes-somos', className: 'card', style: { marginBottom: '2.2rem' } },
    [
      el('div', { className: 'card-body' }, [
        el('h2', { style: { color: 'var(--color-primary)' } }, '¿Quiénes Somos?'),
        el('p', {}, about.historia),
        el('div', { className: 'grid-3', style: { marginTop: '0.6rem' } }, [
          el(
            'div',
            {
              style: {
                padding: '0.95rem',
                background: 'var(--bg-main)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)'
              }
            },
            [
              el('h4', { style: { color: 'var(--color-accent)' } }, '100% Carne de Res & Pan Brioche'),
              el(
                'p',
                { style: { fontSize: '0.9rem', color: 'var(--text-muted)' } },
                'Ingredientes controlados en nuestro sistema de inventario de productos y condimentos en tiempo real.'
              )
            ]
          ),
          el(
            'div',
            {
              style: {
                padding: '0.95rem',
                background: 'var(--bg-main)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)'
              }
            },
            [
              el('h4', { style: { color: 'var(--color-primary)' } }, 'Comunidad & Reseñas Reales'),
              el(
                'p',
                { style: { fontSize: '0.9rem', color: 'var(--text-muted)' } },
                'Nuestros clientes califican con estrellas cada hamburguesa y recomiendan nuevos productos del menú.'
              )
            ]
          ),
          el(
            'div',
            {
              style: {
                padding: '0.95rem',
                background: 'var(--bg-main)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)'
              }
            },
            [
              el('h4', { style: { color: 'var(--status-success)' } }, 'Eventos & Sorteos Mensuales'),
              el(
                'p',
                { style: { fontSize: '0.9rem', color: 'var(--text-muted)' } },
                'Participa en promociones semanales y sorteos exclusivos organizados por la administración.'
              )
            ]
          )
        ])
      ])
    ]
  );

  const productsGrid = el('div', { className: 'grid-3', id: 'home-products-grid' });
  const categorySelect = el(
    'select',
    {
      className: 'form-control',
      style: { minWidth: '240px' },
      'aria-label': 'Filtrar por categoría',
      onChange: (e) => {
        appState.selectedCategory = e.target.value;
        populateHomeProducts(productsGrid);
      }
    },
    [el('option', { value: '' }, 'Todas las Categorías')]
  );

  const catalogSection = el('section', { id: 'catalogo', style: { marginBottom: '2.5rem' } }, [
    el(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.1rem',
          flexWrap: 'wrap',
          gap: '0.8rem'
        }
      },
      [
        el('div', {}, [
          el('h2', {}, 'Nuestro Menú a la Brasa'),
          el(
            'p',
            { style: { color: 'var(--text-muted)' } },
            'Disponibilidad sincronizada en vivo con nuestro inventario.'
          )
        ]),
        categorySelect
      ]
    ),
    productsGrid
  ]);

  const eventsGrid = el('div', { className: 'grid-3', id: 'home-events-grid' });
  const eventsSection = el('section', { id: 'eventos', style: { marginBottom: '2.5rem' } }, [
    el('h2', { style: { marginBottom: '0.35rem' } }, 'Eventos, Promociones y Sorteos Activos'),
    el(
      'p',
      { style: { color: 'var(--text-muted)', marginBottom: '1.1rem' } },
      'Inicia sesión como cliente para inscribirte en sorteos y obtener tu boleto digital.'
    ),
    eventsGrid
  ]);

  const contactSection = el('section', { id: 'contacto', className: 'card' }, [
    el('div', { className: 'card-body' }, [
      el('h2', { style: { color: 'var(--color-primary)' } }, 'Sección de Contacto'),
      el('div', { className: 'grid-3', style: { marginTop: '0.5rem' } }, [
        el('div', {}, [
          el('h4', {}, '📍 Sede Principal'),
          el('p', { style: { color: 'var(--text-muted)' } }, about.contacto.direccion)
        ]),
        el('div', {}, [
          el('h4', {}, '📞 Atención y Domicilios'),
          el(
            'p',
            { style: { color: 'var(--text-muted)' } },
            `${about.contacto.telefono} · ${about.contacto.correo}`
          )
        ]),
        el('div', {}, [
          el('h4', {}, '🕒 Horario de Parrilla'),
          el('p', { style: { color: 'var(--text-muted)' } }, about.contacto.horario)
        ])
      ])
    ])
  ]);

  root.appendChild(hero);
  root.appendChild(aboutSection);
  root.appendChild(catalogSection);
  root.appendChild(eventsSection);
  root.appendChild(contactSection);

  try {
    const [prodRes, evRes] = await Promise.all([
      apiRequest('/products'),
      apiRequest('/events?onlyActive=true')
    ]);
    appState.products = prodRes.data.products || [];
    appState.categories = prodRes.data.categories || [];
    appState.events = evRes.data.events || [];

    for (const cat of appState.categories) {
      categorySelect.appendChild(el('option', { value: String(cat.id) }, cat.nombre));
    }

    populateHomeProducts(productsGrid);
    populateHomeEvents(eventsGrid);
  } catch (err) {
    showNotification(err.message || 'No se pudo conectar con el backend de SazónYA.', 'error');
  }
}

function populateHomeProducts(grid) {
  clearContainer(grid);
  const filtered = appState.selectedCategory
    ? appState.products.filter((p) => p.categoria_id === Number(appState.selectedCategory))
    : appState.products;

  for (const prod of filtered) {
    const img = el('img', {
      src: prod.imagen_url || buildSvgDataUri(prod.nombre),
      alt: prod.nombre,
      className: 'product-img'
    });
    attachImageFallback(img, prod.nombre);

    const card = el('article', { className: 'card' }, [
      img,
      el('div', { className: 'card-body' }, [
        el(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
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
        el('p', { style: { fontSize: '0.9rem', color: 'var(--text-muted)', flex: '1' } }, prod.descripcion),
        el(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.5rem'
            }
          },
          [
            el(
              'span',
              { className: 'price-tag', style: { fontSize: '1.35rem', color: 'var(--color-primary)' } },
              formatCurrency(prod.precio_venta)
            ),
            el(
              'a',
              {
                href: isAuthenticated() ? '#portal' : '#login',
                className: 'btn btn-primary'
              },
              isAuthenticated() ? 'Pedir / Calificar' : 'Inicia Sesión para Pedir'
            )
          ]
        )
      ])
    ]);
    grid.appendChild(card);
  }
  animateStaggerCards(grid, '.card');
}

function populateHomeEvents(grid) {
  clearContainer(grid);
  for (const ev of appState.events) {
    const card = el('article', { className: 'card' }, [
      el('div', { className: 'card-body' }, [
        el('div', { style: { display: 'flex', justifyContent: 'space-between' } }, [
          el('span', { className: 'badge badge-ACTIVO' }, ev.tipo),
          ev.porcentaje_descuento > 0
            ? el('span', { className: 'badge badge-STOCK_BAJO' }, `-${ev.porcentaje_descuento}% DTO`)
            : null
        ]),
        el('h3', {}, ev.titulo),
        el('p', { style: { fontSize: '0.92rem', color: 'var(--text-muted)', flex: '1' } }, ev.descripcion),
        ev.premio_sorteo
          ? el(
              'p',
              { style: { fontSize: '0.86rem', fontWeight: '600', color: 'var(--color-accent)' } },
              `🎁 Premio: ${ev.premio_sorteo}`
            )
          : null,
        ev.cupo_maximo
          ? el(
              'p',
              { style: { fontSize: '0.84rem', color: 'var(--text-muted)' } },
              `Cupos restantes: ${ev.cupos_restantes} de ${ev.cupo_maximo}`
            )
          : null,
        el(
          'a',
          {
            href: isAuthenticated() ? '#portal' : '#login',
            className: 'btn btn-secondary'
          },
          isAuthenticated() ? 'Participar en Mi Portal' : 'Iniciar Sesión para Participar'
        )
      ])
    ]);
    grid.appendChild(card);
  }
  animateStaggerCards(grid, '.card');
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
    { id: 'pedidos', label: '🍔 Realizar Pedidos' },
    { id: 'favoritos', label: '❤️ Favoritos' },
    { id: 'resenas', label: '★ Calificar y Reseñar' },
    { id: 'recomendar', label: '💡 Recomendar Producto' },
    { id: 'eventos', label: '🎟️ Eventos y Sorteos' }
  ];

  const tabBar = el('div', { style: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } });
  const contentArea = el('div', { id: 'portal-tab-content' });

  function drawTabs() {
    clearContainer(tabBar);
    for (const t of tabs) {
      tabBar.appendChild(
        el(
          'button',
          {
            type: 'button',
            className: `btn ${appState.userTab === t.id ? 'btn-primary' : 'btn-outline'}`,
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
          margin: '1.5rem 0 1.25rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }
      },
      [
        el('div', {}, [
          el('h1', { style: { color: 'var(--color-primary)' } }, `Hola, ${sessionState.user?.nombre}`),
          el(
            'p',
            { style: { color: 'var(--text-muted)' } },
            'Realiza pedidos en vivo, administra tu sección de favoritos, califica con estrellas, recomienda productos y participa en sorteos.'
          )
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
    const menuGrid = el('div', { className: 'grid-3' });
    for (const prod of appState.products) {
      const img = el('img', {
        src: prod.imagen_url || buildSvgDataUri(prod.nombre),
        alt: prod.nombre,
        className: 'product-img',
        style: { height: '155px' }
      });
      attachImageFallback(img, prod.nombre);

      const favBtn = el(
        'button',
        {
          type: 'button',
          className: 'btn btn-outline',
          style: { padding: '0.25rem 0.55rem', fontSize: '0.82rem' },
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
        isProductFavorite(prod.id) ? '❤️ Favorito' : '🤍 Favorito'
      );

      const addBtn = el(
        'button',
        {
          type: 'button',
          className: 'btn btn-primary',
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
        prod.stock_actual > 0 ? '+ Agregar al Pedido' : 'Agotado'
      );

      menuGrid.appendChild(
        el('article', { className: 'card' }, [
          img,
          el('div', { className: 'card-body' }, [
            el('div', { style: { display: 'flex', justifyContent: 'space-between' } }, [
              el('span', { className: `badge badge-${prod.estado}` }, prod.estado),
              favBtn
            ]),
            el('h4', {}, prod.nombre),
            el(
              'p',
              { style: { fontSize: '0.85rem', color: 'var(--text-muted)', flex: '1' } },
              prod.descripcion
            ),
            el('div', { style: { display: 'flex', justifyContent: 'space-between' } }, [
              el(
                'strong',
                { className: 'price-tag', style: { color: 'var(--color-primary)', fontSize: '1.15rem' } },
                formatCurrency(prod.precio_venta)
              ),
              el('span', { style: { fontSize: '0.8rem', color: 'var(--text-muted)' } }, `Stock: ${prod.stock_actual}`)
            ]),
            addBtn
          ])
        ])
      );
    }

    // Carrito
    const cartCardBody = el('div', { className: 'card-body' }, [
      el('h3', { style: { color: 'var(--color-primary)' } }, '🛒 Tu Pedido Actual')
    ]);

    if (appState.cart.length === 0) {
      cartCardBody.appendChild(
        el(
          'p',
          { style: { color: 'var(--text-muted)', fontSize: '0.92rem' } },
          'Selecciona hamburguesas, papas o bebidas del menú para armar tu pedido.'
        )
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
                padding: '0.55rem 0',
                borderBottom: '1px solid var(--border-subtle)'
              }
            },
            [
              el('div', {}, [
                el('strong', {}, item.nombre),
                el(
                  'div',
                  { style: { fontSize: '0.82rem', color: 'var(--text-muted)' } },
                  `${formatCurrency(item.precio_venta)} c/u`
                )
              ]),
              el('div', { style: { display: 'flex', alignItems: 'center', gap: '0.45rem' } }, [
                el(
                  'button',
                  {
                    type: 'button',
                    className: 'btn btn-outline',
                    style: { padding: '0.2rem 0.55rem' },
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
                    className: 'btn btn-outline',
                    style: { padding: '0.2rem 0.55rem' },
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
        placeholder: 'Ej: Sin cebolla, extra salsa secreta...'
      });

      const total = appState.cart.reduce((acc, i) => acc + i.precio_venta * i.cantidad, 0);

      cartCardBody.appendChild(
        el('div', { className: 'form-group', style: { marginTop: '0.75rem' } }, [
          el('label', { className: 'form-label' }, 'Notas de preparación o entrega'),
          notesInput
        ])
      );

      cartCardBody.appendChild(
        el(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.75rem 0' } },
          [
            el('span', {}, 'Total a Pagar:'),
            el(
              'strong',
              { className: 'price-tag', style: { fontSize: '1.45rem', color: 'var(--color-primary)' } },
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
          'Confirmar Pedido Ahora'
        )
      );
    }

    const ordersCardBody = el('div', { className: 'card-body' }, [el('h3', {}, 'Mis Pedidos Recientes')]);
    if (appState.myOrders.length === 0) {
      ordersCardBody.appendChild(el('p', { style: { color: 'var(--text-muted)' } }, 'Aún no has realizado pedidos.'));
    } else {
      for (const ord of appState.myOrders) {
        ordersCardBody.appendChild(
          el(
            'div',
            { style: { padding: '0.65rem 0', borderBottom: '1px solid var(--border-subtle)' } },
            [
              el('div', { style: { display: 'flex', justifyContent: 'space-between' } }, [
                el('strong', {}, `Pedido #${ord.id}`),
                el('span', { className: 'badge badge-DISPONIBLE' }, ord.estado)
              ]),
              el(
                'p',
                { style: { fontSize: '0.86rem', color: 'var(--text-muted)' } },
                `Total: ${formatCurrency(ord.total_venta)}${ord.notas_entrega ? ` · "${ord.notas_entrega}"` : ''}`
              )
            ]
          )
        );
      }
    }

    container.appendChild(
      el('div', { className: 'grid-2' }, [
        el('div', {}, [el('h2', { style: { marginBottom: '0.9rem' } }, 'Menú Disponible'), menuGrid]),
        el('div', {}, [
          el('div', { className: 'card', style: { marginBottom: '1.35rem' } }, [cartCardBody]),
          el('div', { className: 'card' }, [ordersCardBody])
        ])
      ])
    );
  } else if (appState.userTab === 'favoritos') {
    container.appendChild(el('h2', { style: { marginBottom: '0.9rem' } }, '❤️ Mi Sección de Favoritos'));
    if (appState.favorites.length === 0) {
      container.appendChild(
        el(
          'div',
          { className: 'card card-body' },
          'Aún no tienes productos en tu sección de favoritos. Marca tus preferidos con ❤️ desde el menú.'
        )
      );
    } else {
      const grid = el('div', { className: 'grid-3' });
      for (const fav of appState.favorites) {
        const img = el('img', {
          src: fav.imagen_url || buildSvgDataUri(fav.nombre),
          alt: fav.nombre,
          className: 'product-img'
        });
        attachImageFallback(img, fav.nombre);

        grid.appendChild(
          el('article', { className: 'card' }, [
            img,
            el('div', { className: 'card-body' }, [
              el('div', { style: { display: 'flex', justifyContent: 'space-between' } }, [
                el('span', { className: `badge badge-${fav.estado}` }, fav.estado),
                el('span', { className: 'stars' }, `★ ${Number(fav.promedio_estrellas || 0).toFixed(1)}`)
              ]),
              el('h3', {}, fav.nombre),
              el('p', { style: { fontSize: '0.9rem', color: 'var(--text-muted)', flex: '1' } }, fav.descripcion),
              el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
                el(
                  'strong',
                  { className: 'price-tag', style: { color: 'var(--color-primary)' } },
                  formatCurrency(fav.precio_venta)
                ),
                el('div', { style: { display: 'flex', gap: '0.45rem' } }, [
                  el(
                    'button',
                    {
                      type: 'button',
                      className: 'btn btn-outline',
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
                      className: 'btn btn-primary',
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
    const starsWrap = el('div', { style: { display: 'flex', gap: '0.45rem' } });
    const commentArea = el('textarea', {
      rows: '3',
      className: 'form-control',
      placeholder: 'Cuéntanos qué te pareció el sabor, la cocción y las salsas...',
      required: 'true'
    });

    function renderStarButtons() {
      clearContainer(starsWrap);
      for (const s of [1, 2, 3, 4, 5]) {
        const starBtn = el(
          'button',
          {
            type: 'button',
            className: `btn ${selectedStars >= s ? 'btn-secondary' : 'btn-outline'}`,
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
          el('label', { className: 'form-label' }, 'Selecciona el Producto'),
          prodSelect
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label' }, 'Calificación (Estrellas 1 a 5)'),
          starsWrap
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label' }, 'Tu Reseña del Producto'),
          commentArea
        ]),
        el('button', { type: 'submit', className: 'btn btn-primary' }, 'Guardar Calificación y Reseña')
      ]
    );

    const reviewsList = el('div', { className: 'card-body' }, [
      el('h3', {}, 'Reseñas de la Comunidad SazónYA')
    ]);
    for (const rev of appState.reviews) {
      reviewsList.appendChild(
        el(
          'div',
          { style: { padding: '0.7rem 0', borderBottom: '1px solid var(--border-subtle)' } },
          [
            el('div', { style: { display: 'flex', justifyContent: 'space-between' } }, [
              el('strong', {}, rev.producto_nombre),
              el('span', { className: 'stars' }, `${'★'.repeat(rev.estrellas)} (${rev.estrellas}/5)`)
            ]),
            el('p', { style: { fontSize: '0.9rem', margin: '0.25rem 0' } }, `"${rev.comentario}"`),
            el('small', { style: { color: 'var(--text-muted)' } }, `Por ${rev.usuario_nombre}`)
          ]
        )
      );
    }

    container.appendChild(
      el('div', { className: 'grid-2' }, [
        el('div', { className: 'card' }, [
          el('div', { className: 'card-body' }, [
            el('h3', { style: { color: 'var(--color-primary)' } }, '★ Calificar Producto y Asignar Reseña'),
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
      placeholder: 'Ej: Hamburguesa Doble Costilla BBQ',
      required: 'true'
    });
    const descInput = el('textarea', {
      rows: '4',
      className: 'form-control',
      placeholder: 'Describe qué ingredientes, quesos o condimentos debería llevar (mínimo 15 caracteres)...',
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
          el('label', { className: 'form-label' }, 'Nombre Sugerido del Producto'),
          nameInput
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label' }, 'Ingredientes y Preparación Sugerida'),
          descInput
        ]),
        el('button', { type: 'submit', className: 'btn btn-primary' }, 'Enviar Recomendación al Administrador')
      ]
    );

    const recList = el('div', { className: 'card-body' }, [el('h3', {}, 'Propuestas Enviadas')]);
    for (const rec of appState.recommendations) {
      recList.appendChild(
        el(
          'div',
          { style: { padding: '0.7rem 0', borderBottom: '1px solid var(--border-subtle)' } },
          [
            el('div', { style: { display: 'flex', justifyContent: 'space-between' } }, [
              el('strong', {}, rec.nombre_sugerido),
              el('span', { className: `badge badge-${rec.estado}` }, rec.estado)
            ]),
            el(
              'p',
              { style: { fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.25rem' } },
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
            el('h3', { style: { color: 'var(--color-primary)' } }, '💡 Recomendar un Nuevo Producto'),
            recForm
          ])
        ]),
        el('div', { className: 'card' }, [recList])
      ])
    );
  } else if (appState.userTab === 'eventos') {
    container.appendChild(
      el(
        'h2',
        { style: { marginBottom: '0.9rem' } },
        '🎉 Eventos, Promociones y Sorteos Asignados por el Administrador'
      )
    );
    const grid = el('div', { className: 'grid-3' });
    for (const ev of appState.events) {
      grid.appendChild(
        el('article', { className: 'card' }, [
          el('div', { className: 'card-body' }, [
            el('div', { style: { display: 'flex', justifyContent: 'space-between' } }, [
              el('span', { className: 'badge badge-ACTIVO' }, ev.tipo),
              ev.porcentaje_descuento > 0
                ? el('span', { className: 'badge badge-STOCK_BAJO' }, `-${ev.porcentaje_descuento}% DTO`)
                : null
            ]),
            el('h3', {}, ev.titulo),
            el('p', { style: { fontSize: '0.9rem', color: 'var(--text-muted)', flex: '1' } }, ev.descripcion),
            ev.premio_sorteo
              ? el(
                  'p',
                  { style: { fontSize: '0.88rem', fontWeight: '600', color: 'var(--color-accent)' } },
                  `🎁 Premio: ${ev.premio_sorteo}`
                )
              : null,
            ev.cupo_maximo
              ? el('p', { style: { fontSize: '0.85rem' } }, `Inscritos: ${ev.total_inscritos} / ${ev.cupo_maximo}`)
              : null,
            ev.usuario_inscrito
              ? el('div', { className: 'status-banner success', style: { margin: '0' } }, [
                  el('span', {}, `🎟️ Boleto: ${ev.codigo_boleto}`)
                ])
              : el(
                  'button',
                  {
                    type: 'button',
                    className: 'btn btn-primary',
                    onClick: async () => {
                      try {
                        const res = await apiRequest(`/events/${ev.id}/participate`, { method: 'POST' });
                        showNotification(res.message, 'success');
                        await loadPortalData();
                        drawActivePortalTab(container);
                      } catch (err) {
                        showNotification(err.message, 'error');
                      }
                    }
                  },
                  'Participar Ahora'
                )
          ])
        ])
      );
    }
    container.appendChild(grid);
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
            className: `btn ${appState.adminTab === t.id ? 'btn-primary' : 'btn-outline'}`,
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
      { className: 'form-control' },
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
      type: 'text',
      className: 'form-control',
      value: editing ? editing.nombre : '',
      placeholder: 'Ej: Burger Triple Tocineta',
      required: 'true'
    });
    const descInput = el('textarea', {
      rows: '3',
      className: 'form-control',
      placeholder: 'Ingredientes y preparación...',
      required: 'true'
    });
    descInput.value = editing ? editing.descripcion : '';

    const costoInput = el('input', {
      type: 'number',
      step: '0.01',
      min: '0',
      className: 'form-control',
      value: editing ? String(editing.costo_unitario) : '3.50',
      required: 'true'
    });
    const precioInput = el('input', {
      type: 'number',
      step: '0.01',
      min: '0.1',
      className: 'form-control',
      value: editing ? String(editing.precio_venta) : '8.90',
      required: 'true'
    });
    const stockInput = el('input', {
      type: 'number',
      min: '0',
      className: 'form-control',
      value: editing ? String(editing.stock_actual) : '25',
      required: 'true'
    });
    const minInput = el('input', {
      type: 'number',
      min: '0',
      className: 'form-control',
      value: editing ? String(editing.stock_minimo) : '5',
      required: 'true'
    });
    const imgInput = el('input', {
      type: 'url',
      className: 'form-control',
      value: editing && editing.imagen_url ? editing.imagen_url : '',
      placeholder: 'https://...'
    });

    const prodForm = el(
      'form',
      {
        onSubmit: async (e) => {
          e.preventDefault();
          try {
            const path = editing ? `/products/${editing.id}` : '/products';
            const method = editing ? 'PUT' : 'POST';
            const res = await apiRequest(path, {
              method,
              body: {
                categoria_id: Number(catSelect.value),
                nombre: nombreInput.value.trim(),
                descripcion: descInput.value.trim(),
                costo_unitario: Number(costoInput.value),
                precio_venta: Number(precioInput.value),
                stock_actual: Number(stockInput.value),
                stock_minimo: Number(minInput.value),
                imagen_url: imgInput.value.trim() || null
              }
            });
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
        el('div', { className: 'form-group' }, [el('label', { className: 'form-label' }, 'Categoría'), catSelect]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label' }, 'Nombre del Producto'),
          nombreInput
        ]),
        el('div', { className: 'form-group' }, [el('label', { className: 'form-label' }, 'Descripción'), descInput]),
        el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' } }, [
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label' }, 'Costo Unitario ($)'),
            costoInput
          ]),
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label' }, 'Precio de Venta ($)'),
            precioInput
          ])
        ]),
        el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' } }, [
          el('div', { className: 'form-group' }, [el('label', { className: 'form-label' }, 'Stock Actual'), stockInput]),
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label' }, 'Stock Mínimo'),
            minInput
          ])
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label' }, 'URL de Imagen (Opcional)'),
          imgInput
        ]),
        el('div', { style: { display: 'flex', gap: '0.6rem' } }, [
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
      tbody.appendChild(
        el('tr', {}, [
          el('td', {}, [
            el('strong', {}, prod.nombre),
            el('div', { style: { fontSize: '0.78rem', color: 'var(--text-muted)' } }, prod.categoria_nombre)
          ]),
          el('td', {}, `${formatCurrency(prod.costo_unitario)} / ${formatCurrency(prod.precio_venta)}`),
          el('td', {}, `${prod.stock_actual} (mín ${prod.stock_minimo})`),
          el('td', {}, [el('span', { className: `badge badge-${prod.estado}` }, prod.estado)]),
          el('td', {}, [
            el('div', { style: { display: 'flex', gap: '0.35rem' } }, [
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline',
                  style: { padding: '0.25rem 0.55rem' },
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
                  className: 'btn btn-danger',
                  style: { padding: '0.25rem 0.55rem' },
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
        el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' } }, [
          el('div', { className: 'form-group' }, [el('label', { className: 'form-label' }, 'Tipo'), tipoSelect]),
          el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label' }, 'Unidad de Medida'),
            unidadInput
          ])
        ]),
        el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' } }, [
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
            el('div', { style: { display: 'flex', gap: '0.35rem' } }, [
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline',
                  style: { padding: '0.22rem 0.5rem' },
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
                  className: 'btn btn-outline',
                  style: { padding: '0.22rem 0.5rem' },
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
    const tituloInput = el('input', {
      type: 'text',
      className: 'form-control',
      placeholder: 'Ej: Viernes de Papas Fritas 2x1',
      required: 'true'
    });
    const descInput = el('textarea', {
      rows: '3',
      className: 'form-control',
      placeholder: 'Condiciones, premios o beneficios...',
      required: 'true'
    });
    const tipoSelect = el('select', { className: 'form-control' }, [
      el('option', { value: 'PROMOCION' }, 'PROMOCION'),
      el('option', { value: 'SORTEO' }, 'SORTEO'),
      el('option', { value: 'EVENTO' }, 'EVENTO')
    ]);
    const dtoInput = el('input', {
      type: 'number',
      min: '0',
      max: '100',
      value: '15',
      className: 'form-control'
    });
    const cupoInput = el('input', {
      type: 'number',
      min: '1',
      value: '50',
      className: 'form-control'
    });
    const premioInput = el('input', {
      type: 'text',
      className: 'form-control',
      placeholder: 'Ej: Combo Parrillero Imperial Gratis'
    });

    const evForm = el(
      'form',
      {
        onSubmit: async (e) => {
          e.preventDefault();
          try {
            const now = new Date();
            const end = new Date(now.getTime() + 14 * 86400000);
            const res = await apiRequest('/events', {
              method: 'POST',
              body: {
                titulo: tituloInput.value.trim(),
                descripcion: descInput.value.trim(),
                tipo: tipoSelect.value,
                porcentaje_descuento: Number(dtoInput.value || 0),
                cupo_maximo: cupoInput.value ? Number(cupoInput.value) : null,
                premio_sorteo: premioInput.value.trim() || null,
                fecha_inicio: now.toISOString(),
                fecha_fin: end.toISOString()
              }
            });
            tituloInput.value = '';
            descInput.value = '';
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
          el('label', { className: 'form-label' }, 'Título del Evento o Promoción'),
          tituloInput
        ]),
        el('div', { className: 'form-group' }, [el('label', { className: 'form-label' }, 'Descripción'), descInput]),
        el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' } }, [
          el('div', { className: 'form-group' }, [el('label', { className: 'form-label' }, 'Tipo'), tipoSelect]),
          el('div', { className: 'form-group' }, [el('label', { className: 'form-label' }, '% Descuento'), dtoInput]),
          el('div', { className: 'form-group' }, [el('label', { className: 'form-label' }, 'Cupo Máx.'), cupoInput])
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { className: 'form-label' }, 'Premio del Sorteo (Opcional)'),
          premioInput
        ]),
        el('button', { type: 'submit', className: 'btn btn-primary' }, 'Publicar Evento / Promoción')
      ]
    );

    const eventsList = el('div', { className: 'card-body' }, [el('h3', {}, 'Eventos y Sorteos Registrados')]);
    for (const ev of appState.events) {
      eventsList.appendChild(
        el(
          'div',
          {
            style: {
              padding: '0.7rem 0',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }
          },
          [
            el('div', {}, [
              el('strong', {}, ev.titulo),
              el(
                'div',
                { style: { fontSize: '0.82rem', color: 'var(--text-muted)' } },
                `${ev.tipo} · Inscritos: ${ev.total_inscritos}`
              )
            ]),
            el('span', { className: `badge badge-${ev.estado}` }, ev.estado)
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
            el('div', { style: { display: 'flex', justifyContent: 'space-between' } }, [
              el('strong', {}, rec.nombre_sugerido),
              el('span', { className: `badge badge-${rec.estado}` }, rec.estado)
            ]),
            el('p', { style: { fontSize: '0.86rem', color: 'var(--text-muted)', margin: '0.25rem 0' } }, rec.descripcion_ingredientes),
            el('div', { style: { display: 'flex', gap: '0.4rem', marginTop: '0.35rem' } }, [
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-outline',
                  style: { padding: '0.2rem 0.55rem', fontSize: '0.78rem' },
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
                  className: 'btn btn-outline',
                  style: { padding: '0.2rem 0.55rem', fontSize: '0.78rem' },
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
            el('h3', { style: { color: 'var(--color-primary)' } }, 'Registrar Nuevo Evento, Promoción o Sorteo'),
            evForm
          ])
        ]),
        el('div', {}, [
          el('div', { className: 'card', style: { marginBottom: '1.35rem' } }, [eventsList]),
          el('div', { className: 'card' }, [recsList])
        ])
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

  if (['quienes-somos', 'catalogo', 'eventos', 'contacto'].includes(hash)) {
    if (appState.route !== 'home') {
      appState.route = 'home';
      renderNavbar();
      renderHomeView(root).then(() => {
        const target = document.getElementById(hash);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    } else {
      const target = document.getElementById(hash);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  }

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
