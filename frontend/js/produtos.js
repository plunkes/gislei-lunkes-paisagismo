/**
 * @typedef {object} Product
 * @property {string} id - Unique product id (string; UUID quando vem da API).
 * @property {string} category - One of kokedama|arranjo|vaso|servico|acessorio.
 * @property {('novo'|'oferta'|null)} badge - Optional corner badge.
 * @property {string} name - Display name.
 * @property {string} desc - Short description.
 * @property {number} price - Current price in BRL.
 * @property {(number|null)} oldPrice - Pre-discount price, or null.
 * @property {string} img - Image URL.
 * @property {('disponivel'|'encomenda')} stock - Availability state.
 */

/**
 * Catálogo de fallback (usado se a API estiver offline). Ids como string para
 * casar com os UUIDs que vêm do backend.
 * @type {Product[]}
 */
const FALLBACK_PRODUCTS = [
  { id: '1', category: 'kokedama', badge: 'novo', name: 'Kokedama Monstera', desc: 'Monstera deliciosa cultivada em bola de musgo artesanal. Perfeita para ambientes iluminados.', price: 89.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=600&q=80', stock: 'disponivel' },
  { id: '2', category: 'kokedama', badge: null, name: 'Kokedama Samambaia', desc: 'Samambaia exuberante com textura delicada, ideal para varanda e banheiro.', price: 64.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80', stock: 'disponivel' },
  { id: '3', category: 'arranjo', badge: 'oferta', name: 'Arranjo Floral Rosa', desc: 'Composição com rosas frescas, verdes e flores silvestres. Duração de 7 a 10 dias.', price: 129.90, oldPrice: 160.00, img: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&q=80', stock: 'disponivel' },
  { id: '4', category: 'vaso', badge: null, name: 'Cachepot Cerâmica Sage', desc: 'Cachepot artesanal em cerâmica com acabamento fosco, cor sage. 15 cm de diâmetro.', price: 49.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80', stock: 'disponivel' },
  { id: '5', category: 'kokedama', badge: null, name: 'Kokedama Peperômia', desc: 'Peperômia obtusifolia em musgo natural. Baixa manutenção, ótima para escritórios.', price: 54.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=600&q=80', stock: 'disponivel' },
  { id: '6', category: 'arranjo', badge: 'novo', name: 'Arranjo Escritório', desc: 'Centro de mesa com plantas tropicais de baixa manutenção, ideal para ambientes corporativos.', price: 189.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1524247108137-732e0f642303?w=600&q=80', stock: 'disponivel' },
  { id: '7', category: 'vaso', badge: null, name: 'Vaso Terracota Rústico', desc: 'Vaso de terracota envelhecida com pátina artesanal. 20 cm. Produto exclusivo.', price: 69.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1512428813834-c702c7702b78?w=600&q=80', stock: 'disponivel' },
  { id: '8', category: 'acessorio', badge: null, name: 'Kit Substrato Especial', desc: 'Mistura ideal para kokedamas: musgo xaxim, terra vegetal e perlita. 2 kg.', price: 34.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600&q=80', stock: 'disponivel' },
  { id: '9', category: 'servico', badge: null, name: 'Workshop de kokedamas', desc: 'Workshop para ensinar a técnica do kokedama: a bola de musgo. Sem conhecimento prévio necessário.', price: 150.00, oldPrice: null, img: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80', stock: 'encomenda' },
  { id: '10', category: 'acessorio', badge: null, name: 'Fertilizante Orgânico', desc: 'Adubo 100% orgânico, ideal para plantas ornamentais e kokedamas. 500 g.', price: 24.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80', stock: 'disponivel' },
];

/**
 * Catálogo ativo. Começa com o fallback e é substituído pelos dados da API em
 * {@link loadProducts}.
 * @type {Product[]}
 */
let PRODUCTS = FALLBACK_PRODUCTS.slice();

/**
 * Normaliza um produto vindo da API (`/api/products`) para o formato usado pelos
 * cards (id string, `desc`, `img`, `stock`).
 * @param {object} p
 * @returns {Product}
 */
function normalizeProduct(p) {
  return {
    id: String(p.id),
    category: p.category,
    badge: p.badge || null,
    name: p.name,
    desc: p.description || '',
    price: Number(p.price),
    oldPrice: p.oldPrice != null ? Number(p.oldPrice) : null,
    img: p.imageUrl || '',
    stock: p.stockStatus || 'disponivel',
  };
}

/**
 * Busca o catálogo no backend. Em caso de falha mantém o fallback, garantindo
 * que a vitrine funcione mesmo sem servidor. Re-renderiza ao concluir.
 * @returns {Promise<void>}
 */
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (Array.isArray(data.products) && data.products.length) {
      PRODUCTS = data.products.map(normalizeProduct);
    }
  } catch {
    /* offline: mantém FALLBACK_PRODUCTS */
  }
  setupPriceFilter();
  applyFilters();
}

/**
 * Ajusta o filtro de preço ao catálogo: o teto (e o valor inicial do slider)
 * passa a ser o preço do produto mais caro, arredondado para cima.
 * @returns {void}
 */
function setupPriceFilter() {
  priceCeil = PRODUCTS.length
    ? Math.ceil(Math.max(...PRODUCTS.map((p) => p.price)))
    : 500;
  maxPrice = priceCeil;
  const range = document.getElementById('price-range');
  if (range) {
    range.max = priceCeil;
    range.value = priceCeil;
  }
  const label = document.getElementById('price-label');
  if (label) label.textContent = `R$ ${priceCeil}`;
}


// Carrinho
/**
 * Cart line items, hydrated from localStorage key `cart_local`.
 * @type {Array<{id: number, name: string, price: number, img: string, qnt: number}>}
 */
let cart = JSON.parse(localStorage.getItem('cart_local') || '[]');
/**
 * Upper price bound (BRL) used by the filter. Atualizado dinamicamente para o
 * preço do produto mais caro em {@link setupPriceFilter}.
 * @type {number}
 */
let maxPrice = 500;
/**
 * Teto de preço do catálogo (preço do produto mais caro). Define o `max` do
 * slider e o valor de reset dos filtros.
 * @type {number}
 */
let priceCeil = 500;
/**
 * Active sort mode: default|priceAsc|priceDesc|name.
 * @type {string}
 */
let sortMode = 'default';

/**
 * Persist the current cart to localStorage.
 * @returns {void}
 */
function saveCart() { localStorage.setItem('cart_local', JSON.stringify(cart)); }

/**
 * Sum of price × quantity across all cart items.
 * @returns {number} Total in BRL.
 */
function cartTotal() { return cart.reduce((s, i) => s + i.price * i.qnt, 0); }

/**
 * Total quantity of items in the cart.
 * @returns {number} Sum of all line quantities.
 */
function cartCount() { return cart.reduce((s, i) => s + i.qnt, 0); }

/**
 * Sync every `.cart-badge` element to the current item count and play the
 * bump animation.
 * @returns {void}
 */
function updateBadge() {
  const n = cartCount();
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(ele => {
    ele.textContent = n;
    ele.classList.add('bump');
    setTimeout(() => ele.classList.remove('bump'), 300);
  });
}

/**
 * Add a product to the cart by id, incrementing quantity if already present,
 * then persist, refresh the badge, and re-render the cart.
 * @param {number} id - Product id from {@link PRODUCTS}.
 * @returns {void}
 */
function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qnt++;
  } else {
    cart.push({ id, name: product.name, price: product.price, img: product.img, qnt: 1 });
  }
  saveCart(); updateBadge(); renderCart();
  // Estatística anônima (LGPD): apenas o id do produto, sem dados pessoais.
  if (typeof window.trackEvent === 'function') window.trackEvent('add_to_cart', id);
}

/**
 * Remove a product from the cart by id, then persist and re-render.
 * @param {number} id - Product id to remove.
 * @returns {void}
 */
function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart(); updateBadge(); renderCart();
}

/**
 * Adjust a cart item's quantity by `delta`, clamped to a minimum of 1.
 * @param {number} id - Product id to adjust.
 * @param {number} delta - Amount to add (e.g. +1 or -1).
 * @returns {void}
 */
function changeqnt(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qnt = Math.max(1, item.qnt + delta);
  saveCart(); updateBadge(); renderCart();
}

/**
 * Force the cart panel visible.
 * @returns {void}
 */
function showCartPanel() {
  const panel = document.getElementById('cart-panel');
  if (panel) {
    panel.classList.remove('hidden');
    panel.classList.add('visible');
  }
}

/**
 * Toggle the cart panel open/closed. On narrow viewports (<= 960px) scrolls the
 * panel into view when opening.
 * @returns {void}
 */
function toggleCart() {
  const panel = document.getElementById('cart-panel');
  if (!panel) return;
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    panel.classList.add('visible');
    // Vai aparecer embaixo
    if (window.innerWidth <= 960) {
      setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  } else {
    panel.classList.add('hidden');
    panel.classList.remove('visible');
  }
}

/**
 * Hide the cart panel.
 * @returns {void}
 */
function closeCart() {
  const panel = document.getElementById('cart-panel');
  if (panel) {
    panel.classList.add('hidden');
    panel.classList.remove('visible');
  }
}

/**
 * Render the cart panel contents from {@link cart}: an empty state when no
 * items, otherwise a list of item rows plus the running total in the footer.
 * @returns {void}
 */
function renderCart() {
  const container = document.getElementById('cart-items');
  const footer = document.getElementById('cart-panel-footer');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <svg viewBox="0 0 24 24">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <p>Carrinho vazio</p>
        <small>Adicione produtos para continuar</small>
      </div>`;
    if (footer) footer.style.display = 'none';
    return;
  }

  // Carrinho com itens: mostra rodapé com subtotal e renderiza as linhas.
  if (footer) footer.style.display = 'block';
  container.innerHTML = cart.map(item => `
    <div class="cart-item" id="ci-${item.id}">
      <img class="cart-item-img" src="${item.img}" alt="${item.name}">
      <div class="cart-item-body">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-price">R$ ${(item.price * item.qnt).toFixed(2).replace('.', ',')}</p>
        <div class="cart-item-qnt">
          <button class="qnt-btn" onclick="changeqnt('${item.id}', -1)">−</button>
          <span class="qnt-value">${item.qnt}</span>
          <button class="qnt-btn" onclick="changeqnt('${item.id}', +1)">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" title="Remover">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`).join('');

  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = 'R$ ' + cartTotal().toFixed(2).replace('.', ',');
}

// Filtros
/**
 * Read the active category and stock checkboxes plus {@link maxPrice}, filter
 * {@link PRODUCTS} accordingly, apply {@link sortMode}, and re-render the grid.
 * @returns {void}
 */
function applyFilters() {
  const categories = ['kokedama', 'arranjo', 'vaso', 'servico', 'acessorio'].filter(c => {
    const el = document.querySelector(`input[value="${c}"]`);
    return el && el.checked;
  });
  const showEncomenda = document.querySelector('input[value="encomenda"]')?.checked;
  const showDisponivel = document.querySelector('input[value="disponivel"]')?.checked;

  let filtered = PRODUCTS.filter(p =>
    categories.includes(p.category) &&
    p.price <= maxPrice &&
    ((showDisponivel && p.stock === 'disponivel') || (showEncomenda && p.stock === 'encomenda'))
  );

  if (sortMode === 'priceAsc') filtered.sort((a, b) => a.price - b.price);
  if (sortMode === 'priceDesc') filtered.sort((a, b) => b.price - a.price);
  if (sortMode === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));

  renderProducts(filtered);
}

/**
 * Update the price ceiling from the range slider, sync its label, and re-filter.
 * @param {(number|string)} val - New max price value.
 * @returns {void}
 */
function updatePrice(val) {
  maxPrice = Number(val);
  document.getElementById('price-label').textContent = `R$ ${val}`;
  applyFilters();
}

/**
 * Set the sort mode and re-filter.
 * @param {string} mode - default|priceAsc|priceDesc|name.
 * @returns {void}
 */
function sortProducts(mode) { sortMode = mode; applyFilters(); }

/**
 * Reset all filter controls to defaults (all categories except encomenda,
 * max price 500, default sort) and re-filter.
 * @returns {void}
 */
function resetFilters() {
  document.querySelectorAll('.filter-option input').forEach(el => {
    el.checked = el.value !== 'encomenda';
  });
  maxPrice = priceCeil;
  document.getElementById('price-range').value = priceCeil;
  document.getElementById('price-label').textContent = `R$ ${priceCeil}`;
  sortMode = 'default';
  document.getElementById('sort-select').value = 'default';
  applyFilters();
}

// Produtos
/**
 * Map a category slug to its PT-BR display label.
 * @param {string} cat - Category slug.
 * @returns {string} Human label, or the slug itself if unknown.
 */
function categoryLabel(cat) {
  return { kokedama: 'Kokedama', arranjo: 'Arranjo Floral', vaso: 'Vaso & Cachepot', servico: 'Serviço', acessorio: 'Acessório' }[cat] || cat;
}

/**
 * Render the product grid from a filtered list, updating the results count and
 * showing an empty state when the list is empty.
 * @param {Product[]} list - Products to display.
 * @returns {void}
 */
function renderProducts(list) {
  const grid = document.getElementById('product-grid');
  document.getElementById('results-count').textContent =
    list.length + (list.length === 1 ? ' produto' : ' produtos');

  if (list.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:64px 0;color:var(--c-text-sub);">
        <p style="font-family:var(--serif);font-size:24px;margin-bottom:8px;">Nenhum produto encontrado</p>
        <small>Experimente ajustar os filtros</small>
      </div>`;
    return;
  }

  grid.innerHTML = list.map((p, idx) => `
    <div class="product-card" style="animation-delay:${idx * 0.05}s" onclick="openProductPopup('${p.id}')">
      <div class="product-img-wrap">
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        ${p.badge ? `<span class="product-badge ${p.badge}">${p.badge === 'novo' ? 'Novo' : 'Oferta'}</span>` : ''}
      </div>
      <div class="product-info">
        <p class="product-category">${categoryLabel(p.category)}</p>
        <p class="product-name">${p.name}</p>
        <p class="product-desc">${p.desc}</p>
        <div class="product-footer">
          <div>
            <span class="product-price">R$ ${p.price.toFixed(2).replace('.', ',')}</span>
            ${p.oldPrice ? `<span class="product-price-old">R$ ${p.oldPrice.toFixed(2).replace('.', ',')}</span>` : ''}
          </div>
          <button class="btn-add-cart" onclick="event.stopPropagation(); addToCart('${p.id}')" id="add-${p.id}">
            <svg viewBox="0 0 24 24"><path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/></svg>
            Adicionar
          </button>
        </div>
      </div>
    </div>`).join('');
}

// ---------------------------------------------------------------------------
// Popup de detalhe do produto (imagem ampliada + descrição)
// ---------------------------------------------------------------------------

/**
 * Abre o popup com a imagem ampliada e a descrição do produto. Registra a
 * abertura como um "clique no produto" para as métricas.
 * @param {string} id - Id do produto.
 * @returns {void}
 */
function openProductPopup(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;

  document.getElementById('pm-img').src = p.img;
  document.getElementById('pm-img').alt = p.name;
  document.getElementById('pm-category').textContent = categoryLabel(p.category);
  document.getElementById('pm-name').textContent = p.name;
  document.getElementById('pm-desc').textContent = p.desc;
  document.getElementById('pm-price').textContent =
    'R$ ' + p.price.toFixed(2).replace('.', ',');
  const oldEl = document.getElementById('pm-oldprice');
  if (p.oldPrice) {
    oldEl.textContent = 'R$ ' + p.oldPrice.toFixed(2).replace('.', ',');
    oldEl.style.display = '';
  } else {
    oldEl.style.display = 'none';
  }
  // Botão de adicionar guarda o id atual.
  document.getElementById('pm-add').dataset.id = id;

  document.getElementById('product-popup').classList.add('open');

  // Métrica: abrir o popup conta como clique no produto.
  if (typeof window.trackEvent === 'function') window.trackEvent('product_click', id);
}

/** Fecha o popup de detalhe do produto. */
function closeProductPopup() {
  document.getElementById('product-popup')?.classList.remove('open');
}

// ---------------------------------------------------------------------------
// Checkout dinâmico (Infinite Pay vs WhatsApp)
// ---------------------------------------------------------------------------

/**
 * Modo de venda atual da loja. Atualizado por {@link loadStoreConfig}.
 * @type {{ ecommerceActive: boolean, whatsappNumber: string|null }}
 */
let storeConfig = { ecommerceActive: true, whatsappNumber: null };

/**
 * Busca o status da loja no backend e ajusta o botão de checkout (texto/estilo).
 * Se o e-commerce estiver desativado, o botão vira "Pedir no WhatsApp".
 * @returns {Promise<void>}
 */
async function loadStoreConfig() {
  try {
    const res = await fetch('/api/config/public');
    if (res.ok) storeConfig = await res.json();
  } catch {
    /* offline: assume e-commerce ativo (padrão) */
  }
  const btn = document.querySelector('.btn-checkout');
  if (btn) {
    if (storeConfig.ecommerceActive) {
      btn.textContent = 'Finalizar compra';
      btn.classList.remove('whatsapp-mode');
    } else {
      btn.textContent = 'Pedir no WhatsApp';
      btn.classList.add('whatsapp-mode');
    }
  }
}

/**
 * Abre o checkout. Exige login (checkout-1) e telefone válido (checkout-2);
 * caso contrário, orienta o usuário e redireciona. Pré-preenche os dados do
 * usuário logado (checkout-3).
 */
function checkout() {
  if (cart.length === 0) return;

  // checkout-1: somente usuários logados.
  if (!getUserToken()) {
    showToast('Faça login para finalizar a compra.', 'error');
    setTimeout(() => (window.location.href = 'login.html'), 1200);
    return;
  }

  const user = getUser();
  // checkout-2: telefone válido obrigatório.
  if (!user || !/^\d{10,13}$/.test(String(user.phone || '').replace(/\D/g, ''))) {
    showToast('Cadastre um WhatsApp válido em "Minha Conta" para comprar.', 'error');
    setTimeout(() => (window.location.href = 'minha-conta.html'), 1400);
    return;
  }

  // checkout-3: pré-preenche e exibe os dados do usuário.
  document.getElementById('co-nome').textContent = user.name;
  document.getElementById('co-email').textContent = user.email;
  document.getElementById('co-telefone').textContent = window.formatPhone
    ? window.formatPhone(user.phone)
    : user.phone;

  const submit = document.getElementById('checkout-submit');
  submit.textContent = storeConfig.ecommerceActive
    ? 'Ir para o pagamento'
    : 'Enviar pedido no WhatsApp';
  submit.disabled = false;

  document.getElementById('checkout-summary').textContent = `${cartCount()} item(ns) · Total R$ ${cartTotal()
    .toFixed(2)
    .replace('.', ',')}`;

  // Reseta para a etapa 1.
  document.getElementById('checkout-step-form').style.display = '';
  document.getElementById('checkout-step-pix').style.display = 'none';
  document.getElementById('checkout-alert').className = 'co-alert';

  document.getElementById('checkout-modal').classList.add('open');
  if (typeof window.trackEvent === 'function') window.trackEvent('checkout_start');
}

/** Fecha o modal de checkout. */
function closeCheckout() {
  document.getElementById('checkout-modal')?.classList.remove('open');
}

/**
 * Mostra a etapa de pagamento PIX (Infinite Pay) com QR Code.
 * @param {{ total: number, pix: { code: string, qrImageUrl: string } }} data
 */
function showPixStep(data) {
  document.getElementById('checkout-step-form').style.display = 'none';
  document.getElementById('checkout-step-pix').style.display = '';
  document.getElementById('pix-qr').src = data.pix.qrImageUrl;
  document.getElementById('pix-code').value = data.pix.code;
  document.getElementById('pix-amount').textContent =
    'Total: R$ ' + Number(data.total).toFixed(2).replace('.', ',');
}

/**
 * Envia o pedido ao backend (`POST /api/checkout`, autenticado). O backend
 * decide o modo: PIX (Infinite Pay) → tela de QR; WhatsApp → redireciona.
 * @param {Event} e
 * @returns {Promise<void>}
 */
async function submitCheckout(e) {
  e.preventDefault();
  const alertBox = document.getElementById('checkout-alert');
  const submit = document.getElementById('checkout-submit');
  alertBox.className = 'co-alert';

  submit.disabled = true;
  const original = submit.textContent;
  submit.textContent = 'Processando…';

  try {
    const data = await authFetch('/checkout', {
      method: 'POST',
      body: JSON.stringify({ cart: cart.map((i) => ({ id: i.id, qnt: i.qnt })) }),
    });

    // Pedido registrado: limpa o carrinho local.
    cart = [];
    saveCart();
    updateBadge();
    renderCart();

    if (data.mode === 'infinitepay') {
      showPixStep(data); // tela de conclusão com QR Code PIX (checkout-4)
    } else {
      // Modo WhatsApp: redireciona com o resumo do pedido.
      window.location.href = data.redirectUrl;
    }
  } catch (err) {
    alertBox.textContent = err.message;
    alertBox.className = 'co-alert error';
    submit.disabled = false;
    submit.textContent = original;
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
updateBadge();
renderCart();
loadProducts(); // busca catálogo na API (com fallback) e renderiza
loadStoreConfig();

const cartPanel = document.getElementById('cart-panel');
if (cartPanel) {
  if (cart.length === 0) cartPanel.classList.add('hidden');
  else cartPanel.classList.add('visible');
}

document.getElementById('checkout-form')?.addEventListener('submit', submitCheckout);
document.getElementById('checkout-cancel')?.addEventListener('click', closeCheckout);
document.getElementById('pix-done')?.addEventListener('click', () => {
  closeCheckout();
  showToast('Pedido registrado! Obrigado pela compra. 🌿', 'success');
});
document.getElementById('pix-copy')?.addEventListener('click', () => {
  const code = document.getElementById('pix-code');
  code.select();
  navigator.clipboard?.writeText(code.value).then(
    () => showToast('Código PIX copiado!', 'success'),
    () => showToast('Copie manualmente o código.', 'info')
  );
});
document.getElementById('checkout-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'checkout-modal') closeCheckout();
});

// Popup de produto: fechar (X), clique fora, e adicionar ao carrinho.
document.getElementById('product-popup-close')?.addEventListener('click', closeProductPopup);
document.getElementById('product-popup')?.addEventListener('click', (e) => {
  if (e.target.id === 'product-popup') closeProductPopup();
});
document.getElementById('pm-add')?.addEventListener('click', (e) => {
  addToCart(e.currentTarget.dataset.id);
  closeProductPopup();
});
