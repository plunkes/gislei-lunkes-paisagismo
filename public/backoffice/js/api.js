'use strict';

/**
 * Backoffice API helper (Vanilla JS).
 *
 * Centraliza o token JWT do funcionário (localStorage), o cabeçalho
 * Authorization e o tratamento de 401 (sessão expirada → volta ao login).
 */

/** Chave do token no localStorage. */
const BO_TOKEN_KEY = 'gl_bo_token';

/** @returns {string|null} Token JWT salvo, ou null. */
function getToken() {
  return localStorage.getItem(BO_TOKEN_KEY);
}

/** @param {string} token Salva o token JWT. */
function setToken(token) {
  localStorage.setItem(BO_TOKEN_KEY, token);
}

/** Remove o token (logout). */
function clearToken() {
  localStorage.removeItem(BO_TOKEN_KEY);
}

/** Redireciona para a tela de login. */
function goToLogin() {
  window.location.href = 'login.html';
}

/**
 * Exibe um toast (substitui `alert()`).
 * @param {string} message
 * @param {'info'|'error'|'success'} [type]
 * @param {number} [duration]
 */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/**
 * Wrapper de `fetch` para a API. Injeta JSON + Bearer token, faz parse da
 * resposta e lança `Error` (com a mensagem do backend) em status >= 400.
 * Em 401 limpa o token e redireciona ao login.
 *
 * @param {string} path - Caminho relativo à API, ex.: '/backoffice/products'.
 * @param {RequestInit} [options]
 * @returns {Promise<any>} Corpo JSON da resposta (ou null em 204).
 * @throws {Error} Mensagem de erro vinda do backend.
 */
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    goToLogin();
    throw new Error('Sessão expirada.');
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = res.status === 204 ? null : isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error((body && body.error) || `Erro ${res.status}`);
  }
  return body;
}

/**
 * Guard de página: chama no topo de páginas protegidas. Redireciona ao login
 * se não houver token válido. Retorna os dados do funcionário autenticado.
 * @returns {Promise<object|undefined>}
 */
async function requireAuth() {
  if (!getToken()) {
    goToLogin();
    return undefined;
  }
  try {
    const { employee } = await api('/backoffice/auth/me');
    return employee;
  } catch {
    clearToken();
    goToLogin();
    return undefined;
  }
}
