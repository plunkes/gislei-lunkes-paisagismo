// Senha forte :) 
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

function handleSignup(e) {
  e.preventDefault();
  let valid = true;

  const nome = document.getElementById('su-nome');
  const email = document.getElementById('su-email');
  const usuario = document.getElementById('su-usuario');
  const senha = document.getElementById('su-senha');
  const confirma = document.getElementById('su-confirma');

  //Reset erros
  [nome, email, usuario, senha, confirma].forEach(el => el.classList.remove('invalid'));
  document.querySelectorAll('.field-error').forEach(el => el.style.display = 'none');

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
  if (!usuario.value.trim() || usuario.value.length < 3 || !/^[a-zA-Z0-9_]+$/.test(usuario.value)) {
    usuario.classList.add('invalid');
    document.getElementById('err-usuario').style.display = 'block';
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

  //Sucesso
  localStorage.setItem('gl_logged_in', 'true');
  localStorage.setItem('gl_username', usuario.value.trim());

  document.getElementById('form-state').style.display = 'none';
  const success = document.getElementById('success-state');
  success.style.display = 'block';

  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.getElementById('redirect-fill').style.width = '100%';
  }));

  setTimeout(() => { window.location.href = 'index.html'; }, 3200);
}
