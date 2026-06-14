'use strict';

/**
 * Página "Minha Conta" (Vanilla JS).
 *
 * Permite: visualizar histórico de pedidos, alterar dados cadastrais (nome,
 * telefone, senha) e excluir a conta. Protegida: exige sessão de usuário.
 * Mensagens via DOM/toasts (sem `alert()`).
 */

const STATUS_LABELS = {
  pendente: 'Pendente',
  pago: 'Pago',
  em_separacao: 'Em separação',
  enviado: 'Enviado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

/** Escapa texto para HTML. */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/** Formata BRL. */
function brl(v) {
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
}

const profileMsg = document.getElementById('profile-msg');

function showProfileMsg(text, kind = 'error') {
  profileMsg.textContent = text;
  profileMsg.className = 'auth-msg ' + kind;
}

/** Preenche o formulário com os dados do usuário. */
function fillProfile(user) {
  document.getElementById('conta-greeting').textContent = `Olá, ${user.name}!`;
  document.getElementById('acc-nome').value = user.name || '';
  document.getElementById('acc-email').value = user.email || '';
  const phoneInput = document.getElementById('acc-telefone');
  phoneInput.value = window.formatPhone ? window.formatPhone(user.phone || '') : user.phone || '';
}

/** Carrega o perfil do backend. */
async function loadProfile() {
  try {
    const { user } = await authFetch('/account');
    setSession(getUserToken(), user); // mantém o cache local atualizado
    fillProfile(user);
  } catch (err) {
    showProfileMsg(err.message);
  }
}

/** Carrega e renderiza o histórico de pedidos. */
async function loadOrders() {
  const list = document.getElementById('orders-list');
  try {
    const { orders } = await authFetch('/account/orders');
    if (!orders.length) {
      list.innerHTML = '<p class="conta-empty">Você ainda não fez pedidos.</p>';
      return;
    }
    list.innerHTML = orders
      .map((o) => {
        const date = new Date(o.createdAt).toLocaleDateString('pt-BR');
        const items = (o.items || [])
          .map((i) => `<li>${i.quantity}× ${esc(i.productName)} — ${brl(i.unitPrice * i.quantity)}</li>`)
          .join('');
        return `
        <div class="order-card">
          <div class="order-head">
            <span class="order-date">${date}</span>
            <span class="order-status ${o.status}">${STATUS_LABELS[o.status] || o.status}</span>
          </div>
          <ul class="order-items">${items}</ul>
          <div class="order-foot">
            <span>${o.paymentMethod === 'infinitepay' ? 'PIX / Infinite Pay' : 'WhatsApp'}</span>
            <strong>${brl(o.total)}</strong>
          </div>
        </div>`;
      })
      .join('');
  } catch (err) {
    list.innerHTML = `<p class="conta-empty">${esc(err.message)}</p>`;
  }
}

// --- Atualizar perfil -----------------------------------------------------
document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  profileMsg.className = 'auth-msg';
  const btn = document.getElementById('btn-save-profile');
  btn.disabled = true;

  const payload = {
    name: document.getElementById('acc-nome').value.trim(),
    phone: document.getElementById('acc-telefone').value.replace(/\D/g, ''),
  };
  const senha = document.getElementById('acc-senha').value;
  if (senha) payload.password = senha;

  try {
    const { user } = await authFetch('/account', { method: 'PUT', body: JSON.stringify(payload) });
    setSession(getUserToken(), user);
    fillProfile(user);
    document.getElementById('acc-senha').value = '';
    showProfileMsg('Dados atualizados com sucesso.', 'ok');
    if (window.showToast) window.showToast('Dados salvos!', 'success');
  } catch (err) {
    showProfileMsg(err.message);
  } finally {
    btn.disabled = false;
  }
});

// --- Excluir conta (confirmação inline, sem alert/confirm) -----------------
document.getElementById('btn-delete-toggle').addEventListener('click', () => {
  document.getElementById('delete-confirm').style.display = 'block';
});
document.getElementById('btn-delete-cancel').addEventListener('click', () => {
  document.getElementById('delete-confirm').style.display = 'none';
});
document.getElementById('btn-delete-confirm').addEventListener('click', async () => {
  try {
    await authFetch('/account', { method: 'DELETE' });
    clearSession();
    if (window.showToast) window.showToast('Conta excluída.', 'success');
    setTimeout(() => (window.location.href = 'index.html'), 900);
  } catch (err) {
    showProfileMsg(err.message);
  }
});

// --- Init: exige login ----------------------------------------------------
if (!getUserToken()) {
  window.location.href = 'login.html';
} else {
  loadProfile();
  loadOrders();
}
