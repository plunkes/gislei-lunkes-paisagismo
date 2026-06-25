'use strict';

/**
 * Lógica da tela de login do backoffice.
 * Autentica via POST /api/backoffice/auth/login, guarda o token e redireciona
 * ao dashboard. Se já houver token válido, pula direto para o dashboard.
 */

// Já logado? vai direto pro painel.
if (getToken()) {
  window.location.href = 'index.html';
}

const form = document.getElementById('login-form');
const alertBox = document.getElementById('alert');
const btn = document.getElementById('btn-login');

/**
 * Exibe mensagem de erro no topo do formulário.
 * @param {string} msg
 */
function showError(msg) {
  alertBox.textContent = msg;
  alertBox.className = 'alert error';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.className = 'alert';
  btn.disabled = true;
  btn.textContent = 'Entrando…';

  try {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('senha').value;
    const { token } = await api('/backoffice/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(token);
    window.location.href = 'index.html';
  } catch (err) {
    showError(err.message || 'Falha no login.');
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});
