'use strict';

/**
 * Tela de cadastro do usuário (Vanilla JS).
 *
 * Valida os campos no cliente, cria a conta via `POST /api/auth/register`
 * (incluindo telefone/WhatsApp obrigatório), guarda a sessão e mostra a
 * animação de sucesso. Erros são exibidos por campo (sem `alert()`).
 */

// Já logado? volta para a home.
if (getUserToken()) {
  window.location.href = 'index.html';
}

/** Medidor de força da senha em tempo real. */
document.getElementById('su-senha').addEventListener('input', function () {
  const v = this.value;
  const fill = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');
  let score = 0;
  if (v.length >= 8) score++;
  if (/[A-Z]/.test(v)) score++;
  if (/[0-9]/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;

  const levels = [
    { w: '0%', bg: 'transparent', txt: '' },
    { w: '25%', bg: '#e74c3c', txt: 'Fraca' },
    { w: '50%', bg: '#e67e22', txt: 'Razoável' },
    { w: '75%', bg: '#f1c40f', txt: 'Boa' },
    { w: '100%', bg: '#27ae60', txt: 'Forte' },
  ];
  fill.style.width = levels[score].w;
  fill.style.background = levels[score].bg;
  label.textContent = v.length ? levels[score].txt : '';
});

/**
 * Valida e envia o cadastro. Chamada pelo `onsubmit` do formulário.
 * @param {SubmitEvent} e
 * @returns {Promise<void>}
 */
async function handleSignup(e) {
  e.preventDefault();
  let valid = true;

  const nome = document.getElementById('su-nome');
  const email = document.getElementById('su-email');
  const telefone = document.getElementById('su-telefone');
  const senha = document.getElementById('su-senha');
  const confirma = document.getElementById('su-confirma');

  // Reset de erros
  [nome, email, telefone, senha, confirma].forEach((el) => el.classList.remove('invalid'));
  document.querySelectorAll('.field-error').forEach((el) => (el.style.display = 'none'));

  const phoneDigits = telefone.value.replace(/\D/g, '');

  if (!nome.value.trim()) {
    nome.classList.add('invalid');
    document.getElementById('err-nome').style.display = 'block';
    valid = false;
  }
  if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    email.classList.add('invalid');
    document.getElementById('err-email').style.display = 'block';
    valid = false;
  }
  if (!/^\d{10,13}$/.test(phoneDigits)) {
    telefone.classList.add('invalid');
    document.getElementById('err-telefone').style.display = 'block';
    valid = false;
  }
  if (senha.value.length < 8) {
    senha.classList.add('invalid');
    document.getElementById('err-senha').style.display = 'block';
    valid = false;
  }
  if (confirma.value !== senha.value || !confirma.value) {
    confirma.classList.add('invalid');
    document.getElementById('err-confirma').style.display = 'block';
    valid = false;
  }

  if (!valid) return;

  const btn = document.getElementById('btn-cadastrar');
  btn.disabled = true;
  btn.textContent = 'Cadastrando…';

  try {
    const data = await authFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: nome.value.trim(),
        email: email.value.trim(),
        phone: phoneDigits,
        password: senha.value,
      }),
    });
    setSession(data.token, data.user);

    // Animação de sucesso
    document.getElementById('form-state').style.display = 'none';
    const success = document.getElementById('success-state');
    success.style.display = 'block';
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.getElementById('redirect-fill').style.width = '100%';
      })
    );
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 3200);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Cadastrar';
    // Mostra o erro do backend reaproveitando a mensagem do campo de e-mail.
    const errEmail = document.getElementById('err-email');
    errEmail.textContent = err.message || 'Falha no cadastro.';
    errEmail.style.display = 'block';
    email.classList.add('invalid');
  }
}
