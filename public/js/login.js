'use strict';

/**
 * Tela de login do usuário (Vanilla JS).
 *
 * - Login local via `POST /api/auth/login`.
 * - Recuperação de senha ("Esqueci minha senha") via `/api/auth/forgot-password`
 *   e `/api/auth/reset-password`.
 * - Login com Google (se um client id estiver configurado).
 *
 * Mensagens são exibidas no próprio card (sem `alert()`).
 */

// Já logado? volta para a home.
if (getUserToken()) {
  window.location.href = 'index.html';
}

const msgBox = document.getElementById('login-msg');
const loginForm = document.getElementById('login-form');
const forgotForm = document.getElementById('forgot-form');
const resetForm = document.getElementById('reset-form');

/**
 * Mostra uma mensagem no card de login.
 * @param {string} text
 * @param {'error'|'ok'} [kind]
 */
function showMsg(text, kind = 'error') {
  msgBox.textContent = text;
  msgBox.className = 'auth-msg ' + kind;
}

function clearMsg() {
  msgBox.className = 'auth-msg';
  msgBox.textContent = '';
}

/** Alterna entre os painéis (login / forgot / reset). */
function showPanel(which) {
  clearMsg();
  loginForm.style.display = which === 'login' ? '' : 'none';
  forgotForm.style.display = which === 'forgot' ? '' : 'none';
  resetForm.style.display = which === 'reset' ? '' : 'none';
}

// --- Login local ----------------------------------------------------------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMsg();
  const btn = document.getElementById('btn-entrar');
  btn.disabled = true;
  btn.textContent = 'Entrando…';
  try {
    const data = await authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('login-email').value.trim(),
        password: document.getElementById('login-senha').value,
      }),
    });
    setSession(data.token, data.user);
    window.location.href = 'index.html';
  } catch (err) {
    showMsg(err.message || 'Falha no login.');
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});

// --- Recuperação de senha -------------------------------------------------
document.getElementById('forgot-toggle').addEventListener('click', (e) => {
  e.preventDefault();
  showPanel('forgot');
});
document.getElementById('forgot-back').addEventListener('click', (e) => {
  e.preventDefault();
  showPanel('login');
});

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMsg();
  const btn = document.getElementById('btn-forgot');
  btn.disabled = true;
  try {
    const data = await authFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: document.getElementById('forgot-email').value.trim() }),
    });
    // Em desenvolvimento o backend devolve o token para concluir o fluxo aqui.
    if (data.resetToken) {
      window.__resetToken = data.resetToken;
      showPanel('reset');
      showMsg('Conta encontrada. Defina sua nova senha abaixo.', 'ok');
    } else {
      showPanel('login');
      showMsg(data.message || 'Se houver uma conta, enviaremos instruções.', 'ok');
    }
  } catch (err) {
    showMsg(err.message || 'Falha ao solicitar redefinição.');
  } finally {
    btn.disabled = false;
  }
});

resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMsg();
  const btn = document.getElementById('btn-reset');
  btn.disabled = true;
  try {
    await authFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: window.__resetToken,
        password: document.getElementById('reset-senha').value,
      }),
    });
    showPanel('login');
    showMsg('Senha redefinida! Faça login com a nova senha.', 'ok');
  } catch (err) {
    showMsg(err.message || 'Falha ao redefinir a senha.');
  } finally {
    btn.disabled = false;
  }
});

// --- Login com Google -----------------------------------------------------
/**
 * Callback do Google Identity Services: envia o ID token ao backend.
 * @param {{credential: string}} response
 */
async function handleGoogleCredential(response) {
  clearMsg();
  try {
    const data = await authFetch('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: response.credential }),
    });
    setSession(data.token, data.user);
    window.location.href = 'index.html';
  } catch (err) {
    showMsg(err.message || 'Falha no login com Google.');
  }
}

// Inicializa o botão do Google apenas se houver client id configurado.
window.addEventListener('load', () => {
  const clientId = window.GOOGLE_CLIENT_ID;
  if (clientId && window.google?.accounts?.id) {
    google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleCredential });
    google.accounts.id.renderButton(document.getElementById('google-btn'), {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
    });
  }
});
