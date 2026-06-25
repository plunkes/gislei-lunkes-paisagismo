'use strict';

/**
 * Dashboard do backoffice (Vanilla JS).
 *
 * Carrega e gerencia produtos/estoque, pedidos e o modo de venda. Toda chamada
 * usa o helper `api()` (js/api.js), que injeta o token e trata 401.
 */

/** Status possíveis de um pedido (espelha o backend). */
const ORDER_STATUSES = [
  'pendente', 'pago', 'em_separacao', 'enviado', 'concluido', 'cancelado',
];

const CATEGORY_LABELS = {
  kokedama: 'Kokedama',
  arranjo: 'Arranjo Floral',
  vaso: 'Vaso & Cachepot',
  servico: 'Serviço',
  acessorio: 'Acessório',
};

/**
 * Formata número como moeda BRL.
 * @param {number|string} v
 * @returns {string}
 */
function brl(v) {
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
}

/** Escapa texto para inserção segura em HTML (evita XSS no painel). */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// ---------------------------------------------------------------------------
// Navegação por abas
// ---------------------------------------------------------------------------
function setupTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
  });
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------
const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const modalAlert = document.getElementById('modal-alert');
const imgFileInput = document.getElementById('p-img-file');
const imgUrlInput = document.getElementById('p-img');
const imgStatus = document.getElementById('p-img-status');
const imgPreview = document.getElementById('p-img-preview');

/** Mostra/esconde o preview da imagem conforme a URL atual. */
function updateImagePreview() {
  const url = imgUrlInput.value.trim();
  if (url) {
    imgPreview.src = url;
    imgPreview.hidden = false;
  } else {
    imgPreview.removeAttribute('src');
    imgPreview.hidden = true;
  }
}

/**
 * Faz upload do arquivo escolhido para o backend e preenche o campo de URL
 * com o caminho retornado. Usa FormData nativo + helper `apiUpload`.
 */
async function handleImageUpload() {
  const file = imgFileInput.files[0];
  if (!file) return;
  imgStatus.textContent = 'Enviando imagem…';
  imgStatus.className = 'upload-status';
  try {
    const formData = new FormData();
    formData.append('image', file);
    const { url } = await apiUpload('/backoffice/uploads', formData);
    imgUrlInput.value = url;
    updateImagePreview();
    imgStatus.textContent = 'Imagem enviada com sucesso.';
    imgStatus.className = 'upload-status ok';
  } catch (err) {
    imgStatus.textContent = err.message;
    imgStatus.className = 'upload-status error';
  } finally {
    imgFileInput.value = ''; // permite reenviar o mesmo arquivo.
  }
}

/** Carrega e renderiza a tabela de produtos. */
async function loadProducts() {
  const body = document.getElementById('products-body');
  try {
    const { products } = await api('/backoffice/products');
    if (!products.length) {
      body.innerHTML = '<tr><td colspan="7" class="empty">Nenhum produto cadastrado.</td></tr>';
      return;
    }
    body.innerHTML = products
      .map(
        (p) => `
      <tr>
        <td><img class="thumb" src="${esc(p.imageUrl || '')}" alt=""></td>
        <td>${esc(p.name)}</td>
        <td>${esc(CATEGORY_LABELS[p.category] || p.category)}</td>
        <td>${brl(p.price)}</td>
        <td>${p.quantity}</td>
        <td>
          <span class="pill ${p.active ? p.stockStatus : 'inativo'}">
            ${p.active ? (p.stockStatus === 'disponivel' ? 'Disponível' : 'Encomenda') : 'Inativo'}
          </span>
        </td>
        <td>
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Editar</button>
            <button class="btn btn-danger btn-sm" data-del="${p.id}">Excluir</button>
          </div>
        </td>
      </tr>`
      )
      .join('');

    // Liga ações (guarda os dados na closure para edição).
    body.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () =>
        openProductModal(products.find((p) => p.id === b.dataset.edit))
      )
    );
    body.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', () => deleteProduct(b.dataset.del))
    );
  } catch (err) {
    body.innerHTML = `<tr><td colspan="7" class="empty">${esc(err.message)}</td></tr>`;
  }
}

/**
 * Abre o modal de produto. Sem argumento = criação; com produto = edição.
 * @param {object} [p]
 */
function openProductModal(p) {
  modalAlert.className = 'alert';
  productForm.reset();
  document.getElementById('modal-title').textContent = p ? 'Editar produto' : 'Novo produto';
  document.getElementById('p-id').value = p?.id || '';
  document.getElementById('p-name').value = p?.name || '';
  document.getElementById('p-desc').value = p?.description || '';
  document.getElementById('p-category').value = p?.category || 'kokedama';
  document.getElementById('p-badge').value = p?.badge || '';
  document.getElementById('p-price').value = p?.price ?? '';
  document.getElementById('p-oldprice').value = p?.oldPrice ?? '';
  document.getElementById('p-qty').value = p?.quantity ?? 0;
  document.getElementById('p-stock').value = p?.stockStatus || 'disponivel';
  document.getElementById('p-img').value = p?.imageUrl || '';
  document.getElementById('p-active').checked = p ? p.active : true;
  imgFileInput.value = '';
  imgStatus.textContent = '';
  imgStatus.className = 'upload-status';
  updateImagePreview();
  productModal.classList.add('open');
}

function closeProductModal() {
  productModal.classList.remove('open');
}

/** Salva (cria ou atualiza) o produto do formulário. */
async function saveProduct(e) {
  e.preventDefault();
  modalAlert.className = 'alert';
  const id = document.getElementById('p-id').value;
  const payload = {
    name: document.getElementById('p-name').value.trim(),
    description: document.getElementById('p-desc').value.trim(),
    category: document.getElementById('p-category').value,
    badge: document.getElementById('p-badge').value || null,
    price: Number(document.getElementById('p-price').value),
    oldPrice: document.getElementById('p-oldprice').value
      ? Number(document.getElementById('p-oldprice').value)
      : null,
    quantity: Number(document.getElementById('p-qty').value) || 0,
    stockStatus: document.getElementById('p-stock').value,
    imageUrl: document.getElementById('p-img').value.trim() || null,
    active: document.getElementById('p-active').checked,
  };
  try {
    if (id) {
      await api(`/backoffice/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/backoffice/products', { method: 'POST', body: JSON.stringify(payload) });
    }
    closeProductModal();
    loadProducts();
  } catch (err) {
    modalAlert.textContent = err.message;
    modalAlert.className = 'alert error';
  }
}

/** Remove um produto após confirmação. */
async function deleteProduct(id) {
  if (!confirm('Excluir este produto? Esta ação não pode ser desfeita.')) return;
  try {
    await api(`/backoffice/products/${id}`, { method: 'DELETE' });
    loadProducts();
    showToast('Produto excluído.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
async function loadOrders() {
  const body = document.getElementById('orders-body');
  try {
    const { orders } = await api('/backoffice/orders');
    if (!orders.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty">Nenhum pedido ainda.</td></tr>';
      return;
    }
    body.innerHTML = orders
      .map((o) => {
        const itemCount = (o.items || []).reduce((s, i) => s + i.quantity, 0);
        const date = new Date(o.createdAt).toLocaleDateString('pt-BR');
        const options = ORDER_STATUSES.map(
          (s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`
        ).join('');
        return `
        <tr>
          <td>${date}</td>
          <td>${esc(o.customerName)}<br><small style="color:#888">${esc(o.customerEmail || o.customerPhone || '')}</small></td>
          <td>${itemCount}</td>
          <td>${brl(o.total)}</td>
          <td><span class="pill">${o.paymentMethod === 'infinitepay' ? 'Infinite Pay' : 'WhatsApp'}</span></td>
          <td><select class="status-select" data-order="${o.id}">${options}</select></td>
        </tr>`;
      })
      .join('');

    body.querySelectorAll('.status-select').forEach((sel) =>
      sel.addEventListener('change', () => updateOrderStatus(sel.dataset.order, sel.value))
    );
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6" class="empty">${esc(err.message)}</td></tr>`;
  }
}

/** Atualiza o status de um pedido. */
async function updateOrderStatus(id, status) {
  try {
    await api(`/backoffice/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  } catch (err) {
    showToast(err.message, 'error');
    loadOrders();
  }
}

// ---------------------------------------------------------------------------
// Configuração (modo de venda)
// ---------------------------------------------------------------------------
function renderModeBanner(active) {
  const banner = document.getElementById('mode-banner');
  banner.className = 'mode-banner ' + (active ? 'on' : 'off');
  banner.textContent = active
    ? '🟢 Loja em modo E-commerce: checkout online via Infinite Pay.'
    : '🟠 Loja em modo WhatsApp: pedidos enviados como mensagem.';
}

async function loadConfig() {
  try {
    const { config } = await api('/backoffice/config');
    document.getElementById('toggle-ecommerce').checked = config.ecommerceActive;
    document.getElementById('cfg-whatsapp').value = config.whatsappNumber || '';
    document.getElementById('cfg-store').value = config.storeName || '';
    renderModeBanner(config.ecommerceActive);
  } catch (err) {
    const a = document.getElementById('config-alert');
    a.textContent = err.message;
    a.className = 'alert error';
  }
}

async function saveConfig() {
  const a = document.getElementById('config-alert');
  a.className = 'alert';
  const payload = {
    ecommerceActive: document.getElementById('toggle-ecommerce').checked,
    whatsappNumber: document.getElementById('cfg-whatsapp').value.trim(),
    storeName: document.getElementById('cfg-store').value.trim(),
  };
  try {
    const { config } = await api('/backoffice/config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    renderModeBanner(config.ecommerceActive);
    a.textContent = 'Configuração salva.';
    a.className = 'alert ok';
  } catch (err) {
    a.textContent = err.message;
    a.className = 'alert error';
  }
}

// ---------------------------------------------------------------------------
// Métricas / estatísticas (dashboard)
// ---------------------------------------------------------------------------

/** Rótulos amigáveis por tipo de evento. Define também a ordem dos cards. */
const EVENT_LABELS = {
  pageview: 'Visitas a páginas',
  add_to_cart: 'Adições ao carrinho',
  product_click: 'Cliques em produtos',
  checkout_start: 'Checkouts iniciados',
};

/**
 * Páginas exibidas no gráfico de visitas, com nomes amigáveis. Apenas estes
 * caminhos aparecem — rotas internas/técnicas (backoffice, termos, etc.) ficam
 * de fora para o painel ser claro a quem não é dev.
 */
const PAGE_LABELS = {
  '/index.html': 'Página inicial',
  '/produtos.html': 'Produtos',
  '/signup.html': 'Criar conta',
  '/login.html': 'Entrar (login)',
  '/minha-conta.html': 'Minha conta',
};

/**
 * Renderiza uma lista de barras horizontais proporcionais ao maior valor.
 * @param {HTMLElement} container
 * @param {Array<{label: string, total: number}>} rows
 */
function renderBars(container, rows) {
  if (!rows.length) {
    container.innerHTML = '<p class="empty" style="padding:24px 0">Sem dados ainda.</p>';
    return;
  }
  const max = Math.max(...rows.map((r) => r.total)) || 1;
  container.innerHTML = rows
    .map((r) => {
      const pct = Math.round((r.total / max) * 100);
      return `
      <div class="bar-row">
        <div class="bar-head">
          <span class="bar-name" title="${esc(r.label)}">${esc(r.label)}</span>
          <span class="bar-count">${r.total}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    })
    .join('');
}

/**
 * Carrega o resumo de métricas do backend e desenha cards + listas de barras.
 * Mapeia ids de produto (refId) para nomes usando o catálogo do backoffice.
 */
async function loadAnalytics() {
  const alert = document.getElementById('metrics-alert');
  alert.className = 'alert';
  try {
    const [{ byType, byPath, topCart }, { products }] = await Promise.all([
      api('/backoffice/analytics'),
      api('/backoffice/products'),
    ]);

    const nameById = Object.fromEntries((products || []).map((p) => [String(p.id), p.name]));

    // Cards por tipo de evento (na ordem de EVENT_LABELS, 0 quando ausente).
    const totals = Object.fromEntries(byType.map((r) => [r.eventType, Number(r.total)]));
    document.getElementById('stat-cards').innerHTML = Object.entries(EVENT_LABELS)
      .map(
        ([type, label]) => `
      <div class="stat-card">
        <div class="stat-value">${totals[type] || 0}</div>
        <div class="stat-label">${label}</div>
      </div>`
      )
      .join('');

    // Páginas mais vistas — apenas as páginas públicas relevantes, com nomes
    // amigáveis (ordenadas pela contagem).
    const pageRows = byPath
      .filter((r) => PAGE_LABELS[r.path])
      .map((r) => ({ label: PAGE_LABELS[r.path], total: Number(r.total) }))
      .sort((a, b) => b.total - a.total);
    renderBars(document.getElementById('metrics-pages'), pageRows);

    // Produtos mais adicionados ao carrinho (id → nome).
    renderBars(
      document.getElementById('metrics-cart'),
      topCart.map((r) => ({
        label: nameById[String(r.refId)] || `Produto #${r.refId}`,
        total: Number(r.total),
      }))
    );
  } catch (err) {
    alert.textContent = err.message;
    alert.className = 'alert error';
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
async function init() {
  const employee = await requireAuth();
  if (!employee) return; // requireAuth já redirecionou.

  document.getElementById('who-name').textContent = `${employee.name} · ${employee.role}`;
  document.getElementById('btn-logout').addEventListener('click', () => {
    clearToken();
    goToLogin();
  });

  setupTabs();

  // Produtos
  document.getElementById('btn-new-product').addEventListener('click', () => openProductModal());
  document.getElementById('btn-cancel-product').addEventListener('click', closeProductModal);
  imgFileInput.addEventListener('change', handleImageUpload);
  imgUrlInput.addEventListener('input', updateImagePreview);
  productForm.addEventListener('submit', saveProduct);
  productModal.addEventListener('click', (e) => {
    if (e.target === productModal) closeProductModal();
  });

  // Config
  document.getElementById('btn-save-config').addEventListener('click', saveConfig);

  // Métricas
  document.getElementById('btn-reload-metrics').addEventListener('click', loadAnalytics);

  // Carrega dados
  loadProducts();
  loadOrders();
  loadConfig();
  loadAnalytics();
}

init();
