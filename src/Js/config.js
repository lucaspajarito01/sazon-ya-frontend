export const CONFIG = Object.freeze({
  API_BASE_URL:
    (typeof window !== 'undefined' && window.__SAZON_API_URL__) ||
    'http://localhost:3001/api/v1',
  APP_NAME: 'SazónYA',
  TAGLINE: 'Sabor a la brasa al instante',
  STORAGE_KEYS: Object.freeze({
    TOKEN: 'sazon_ya_jwt_token',
    USER: 'sazon_ya_auth_user'
  }),
  ABOUT_INFO: Object.freeze({
    mision: 'Hamburguesas artesanales a la brasa y papas rústicas en tiempo récord.',
    historia: 'Parrilla urbana desde 2022: pan brioche diario, cheddar madurado y brasa real.',
    contacto: Object.freeze({
      direccion: 'Av. Gastronómica #45-18, Zona Grill Central',
      telefono: '+57 (300) 555-0199',
      correo: 'hola@sazonya.com',
      horario: 'Lunes a Domingo · 11:30 AM – 11:30 PM'
    })
  })
});
