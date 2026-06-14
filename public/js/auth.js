'use strict';

/**
 * Sessão do usuário (frontend público) — Vanilla JS.
 *
 * Centraliza o token JWT do cliente, os dados do usuário e a atualização do
 * indicador de sessão na navbar (Login/SignIn ↔ Conta/LogOut). Incluído antes
 * dos demais scripts em todas as páginas públicas.
 */

const GL_TOKEN_KEY = 'gl_token';
const GL_USER_KEY = 'gl_user';

/** @returns {string|null} Token JWT do usuário, ou null. */
function getUserToken() {
  return localStorage.getItem(GL_TOKEN_KEY);
}

/** @returns {object|null} Dados do usuário salvos, ou null. */
function getUser() {
  try {
    return JSON.parse(localStorage.getItem(GL_USER_KEY) || 'null');
  } catch {
    return null;
  }
}

/**
 * Persiste a sessão (token + usuário).
 * @param {string} token
 * @param {object} user
 */
function setSession(token, user) {
  localStorage.setItem(GL_TOKEN_KEY, token);
  localStorage.setItem(GL_USER_KEY, JSON.stringify(user || null));
}

/** Limpa a sessão (logout). */
function clearSession() {
  localStorage.removeItem(GL_TOKEN_KEY);
  localStorage.removeItem(GL_USER_KEY);
  // Remove também a flag legada do protótipo.
  localStorage.removeItem('gl_logged_in');
}

/** Encerra a sessão e volta à página inicial. */
function logout() {
  clearSession();
  window.location.href = 'index.html';
}

/**
 * Wrapper de `fetch` para a API do cliente: injeta JSON + Bearer token e faz
 * parse. Em 401 limpa a sessão. Lança `Error` com a mensagem do backend.
 *
 * @param {string} path - Caminho relativo à API, ex.: '/account'.
 * @param {RequestInit} [options]
 * @returns {Promise<any>} Corpo JSON (ou null em 204).
 */
async function authFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getUserToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) clearSession();

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = res.status === 204 ? null : isJson ? await res.json() : null;
  if (!res.ok) throw new Error((body && body.error) || `Erro ${res.status}`);
  return body;
}

/**
 * Atualiza o indicador de sessão em toda a navegação (header, sidebar mobile,
 * footer). Sem login: mantém "Login"/"Sign In". Logado: vira "Conta" (→
 * minha-conta) e "LogOut" (encerra a sessão). Funciona em qualquer página por
 * varrer os links por destino, sem exigir ids específicos.
 */
function applySessionUI() {
  const logged = !!getUserToken();
  if (!logged) return;

  document.querySelectorAll('a[href$="login.html"]').forEach((a) => {
    a.textContent = 'Conta';
    a.setAttribute('href', 'minha-conta.html');
  });
  document.querySelectorAll('a[href$="signup.html"]').forEach((a) => {
    a.textContent = 'LogOut';
    a.setAttribute('href', '#');
    a.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  });
}

document.addEventListener('DOMContentLoaded', applySessionUI);
