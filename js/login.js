function handleLogin(e) {
  e.preventDefault();
  const usuario = document.getElementById('login-usuario').value;
  const senha = document.getElementById('login-senha').value;
  if (usuario && senha) {
    localStorage.setItem('gl_logged_in', 'true');
    localStorage.setItem('gl_username', usuario);
    window.location.href = 'index.html';
  }
}
