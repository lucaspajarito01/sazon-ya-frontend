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

export function resolveAssetUrl(url, baseUrl = CONFIG.API_BASE_URL) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  const normalizedSchemeCheck = trimmed.replace(/[\u0000-\u001f\u007f\s]+/g, '').toLowerCase();
  if (
    normalizedSchemeCheck.startsWith('javascript:') ||
    normalizedSchemeCheck.startsWith('vbscript:') ||
    normalizedSchemeCheck.startsWith('data:text/html') ||
    normalizedSchemeCheck.startsWith('data:image/svg+xml')
  ) {
    return '';
  }
  if (trimmed.startsWith('/uploads/')) {
    const fallbackOrigin =
      typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:3001';
    try {
      const origin = new URL(baseUrl, fallbackOrigin).origin;
      return `${origin}${trimmed}`;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export async function apiRequest(
  path,
  { method = 'GET', body = undefined, headers = {}, baseUrl = CONFIG.API_BASE_URL } = {}
) {
  const normalizedBaseUrl = String(baseUrl || '').replace(/\/+$/, '');
  const url = `${normalizedBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const extraHeaders =
    typeof Headers !== 'undefined' && headers instanceof Headers
      ? Object.fromEntries(headers.entries())
      : headers || {};
  const requestHeaders = {
    Accept: 'application/json',
    'X-Client-Min-Major': '1',
    ...extraHeaders
  };

  const hasContentType = Object.keys(requestHeaders).some((k) => k.toLowerCase() === 'content-type');
  if (body !== undefined && !isFormData && !hasContentType) {
    requestHeaders['Content-Type'] = 'application/json';
  }
  if (isFormData) {
    for (const key of Object.keys(requestHeaders)) {
      if (key.toLowerCase() === 'content-type') {
        delete requestHeaders[key];
      }
    }
  }

  if (sessionState.token) {
    requestHeaders.Authorization = `Bearer ${sessionState.token}`;
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body)
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
