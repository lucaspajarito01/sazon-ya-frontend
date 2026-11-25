import { CONFIG } from './config.js';
import { ROLES } from './roles.js';

function getStorage(type = 'local') {
  if (typeof window === 'undefined') return null;
  return type === 'local' ? window.localStorage : window.sessionStorage;
}

function readStoredUser() {
  try {
    const local = getStorage('local');
    const sess = getStorage('session');
    const raw =
      (local && local.getItem(CONFIG.STORAGE_KEYS.USER)) ||
      (sess && sess.getItem(CONFIG.STORAGE_KEYS.USER));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readStoredToken() {
  const local = getStorage('local');
  const sess = getStorage('session');
  return (
    (local && local.getItem(CONFIG.STORAGE_KEYS.TOKEN)) ||
    (sess && sess.getItem(CONFIG.STORAGE_KEYS.TOKEN)) ||
    null
  );
}

export const sessionState = {
  user: readStoredUser(),
  token: readStoredToken()
};

const listeners = new Set();

export function onSessionChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners() {
  for (const cb of listeners) {
    cb(sessionState);
  }
}

export function saveSession({ user, token, remember = true }) {
  sessionState.user = user;
  sessionState.token = token;

  const local = getStorage('local');
  const sess = getStorage('session');
  if (local && sess) {
    const target = remember ? local : sess;
    const secondary = remember ? sess : local;
    secondary.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    secondary.removeItem(CONFIG.STORAGE_KEYS.USER);
    target.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    target.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
  }
  notifyListeners();
}

export function clearSession() {
  sessionState.user = null;
  sessionState.token = null;
  const local = getStorage('local');
  const sess = getStorage('session');
  if (local) {
    local.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    local.removeItem(CONFIG.STORAGE_KEYS.USER);
  }
  if (sess) {
    sess.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    sess.removeItem(CONFIG.STORAGE_KEYS.USER);
  }
  notifyListeners();
}

export function isAuthenticated() {
  return Boolean(sessionState.token && sessionState.user);
}

export function isAdmin() {
  return isAuthenticated() && sessionState.user?.rol === ROLES.ADMIN;
}
