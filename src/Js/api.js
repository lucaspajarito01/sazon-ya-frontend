import { CONFIG } from './config.js';
import { sessionState, clearSession } from './session.js';

export class ApiError extends Error {
  constructor(message, status = 400, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = Array.isArray(errors) ? errors : [];
  }
}

export async function apiRequest(
  path,
  { method = 'GET', body = undefined, headers = {}, baseUrl = CONFIG.API_BASE_URL } = {}
) {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const requestHeaders = {
    Accept: 'application/json',
    'X-Client-Min-Major': '1',
    ...headers
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (sessionState.token) {
    requestHeaders.Authorization = `Bearer ${sessionState.token}`;
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = { success: false, message: 'Respuesta no válida del servidor.' };
  }

  if (!response.ok || payload?.success === false) {
    if (response.status === 401 && path !== '/auth/login') {
      clearSession();
    }
    throw new ApiError(
      payload?.message || `Error HTTP ${response.status}`,
      response.status,
      payload?.errors || []
    );
  }

  return payload;
}
