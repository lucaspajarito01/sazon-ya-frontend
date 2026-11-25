# Requerimientos Oficiales — `sazon-ya-frontend` (HTML5 + CSS3 + JavaScript Puro)

## 1. Contexto y Filosofía Zero-Bloat
Frontend modular en **HTML5, CSS3 y JavaScript Puro (ES2022+)** sin frameworks externos (cero Vue/React), con motor propio de animaciones en JavaScript (`Web Animations API` y bucle único `requestAnimationFrame` a 60 FPS) y paleta oficial *«Sazón & Brasa»* (`#E63946` Rojo Brasa, `#FFB703` Mostaza Cheddar, `#FB8500` Naranja Grill, `#FFFDF9` Crema Pan Brioche).

## 2. Separación Modular (`src/html`, `src/css`, `src/Js`)
- `index.html` y `src/html/index.html`: Punto de entrada HTML5 semántico.
- `src/css/styles.css`: Paleta *«Sazón & Brasa»*, diseño responsivo y soporte `prefers-reduced-motion`.
- `src/Js/config.js`: URLs base (`API_BASE_URL`) y catálogos estáticos.
- `src/Js/roles.js`: Enumeración inmutable `Object.freeze({ ADMIN, USER })`.
- `src/Js/session.js`: Persistencia dual (`localStorage` / `sessionStorage`) y observadores de sesión.
- `src/Js/api.js`: Cliente HTTP centralizado (`fetch` nativo) con clase `ApiError(message, status, errors)`, cabecera `Authorization: Bearer` y `X-Client-Min-Major: 1`.
- `src/Js/ui.js`: Manipulación DOM segura contra XSS (`createElement`, `textContent`, `CSS.escape`), cadena de fallback de imágenes en 3 niveles (`buildSvgDataUri`), mapeo de errores a inputs (`aria-invalid="true"`) y animaciones en JavaScript (`animateStaggerCards`, `animatePulse`, `animateCounter`).
- `src/Js/app.js`: Enrutador SPA y vistas completas para Visitante, Cliente y Administrador.
