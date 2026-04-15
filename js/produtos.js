// Mock lendário
const PRODUCTS = [
  { id: 1, category: 'kokedama', badge: 'novo', name: 'Kokedama Monstera', desc: 'Monstera deliciosa cultivada em bola de musgo artesanal. Perfeita para ambientes iluminados.', price: 89.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=600&q=80', stock: 'disponivel' },
  { id: 2, category: 'kokedama', badge: null, name: 'Kokedama Samambaia', desc: 'Samambaia exuberante com textura delicada, ideal para varanda e banheiro.', price: 64.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80', stock: 'disponivel' },
  { id: 3, category: 'arranjo', badge: 'oferta', name: 'Arranjo Floral Rosa', desc: 'Composição com rosas frescas, verdes e flores silvestres. Duração de 7 a 10 dias.', price: 129.90, oldPrice: 160.00, img: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&q=80', stock: 'disponivel' },
  { id: 4, category: 'vaso', badge: null, name: 'Cachepot Cerâmica Sage', desc: 'Cachepot artesanal em cerâmica com acabamento fosco, cor sage. 15 cm de diâmetro.', price: 49.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80', stock: 'disponivel' },
  { id: 5, category: 'kokedama', badge: null, name: 'Kokedama Peperômia', desc: 'Peperômia obtusifolia em musgo natural. Baixa manutenção, ótima para escritórios.', price: 54.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=600&q=80', stock: 'disponivel' },
  { id: 6, category: 'arranjo', badge: 'novo', name: 'Arranjo Escritório', desc: 'Centro de mesa com plantas tropicais de baixa manutenção, ideal para ambientes corporativos.', price: 189.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1524247108137-732e0f642303?w=600&q=80', stock: 'disponivel' },
  { id: 7, category: 'vaso', badge: null, name: 'Vaso Terracota Rústico', desc: 'Vaso de terracota envelhecida com pátina artesanal. 20 cm. Produto exclusivo.', price: 69.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1512428813834-c702c7702b78?w=600&q=80', stock: 'disponivel' },
  { id: 8, category: 'acessorio', badge: null, name: 'Kit Substrato Especial', desc: 'Mistura ideal para kokedamas: musgo xaxim, terra vegetal e perlita. 2 kg.', price: 34.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600&q=80', stock: 'disponivel' },
  { id: 9, category: 'servico', badge: null, name: 'Workshop de kokedamas', desc: 'Workshop para ensinar a técnica do kokedama: a bola de musgo. Sem conhecimento prévio necessário.', price: 150.00, oldPrice: null, img: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80', stock: 'encomenda' },
  { id: 10, category: 'acessorio', badge: null, name: 'Fertilizante Orgânico', desc: 'Adubo 100% orgânico, ideal para plantas ornamentais e kokedamas. 500 g.', price: 24.90, oldPrice: null, img: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80', stock: 'disponivel' },
];


// Carrinho 
let cart = JSON.parse(localStorage.getItem('cart_local') || '[]');
let maxPrice = 500;
let sortMode = 'default';

function saveCart() { localStorage.setItem('cart_local', JSON.stringify(cart)); }
function cartTotal() { return cart.reduce((s, i) => s + i.price * i.qnt, 0); }
function cartCount() { return cart.reduce((s, i) => s + i.qnt, 0); }

function updateBadge() {
  const n = cartCount();
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(ele => {
    ele.textContent = n;
    ele.classList.add('bump');
    setTimeout(() => ele.classList.remove('bump'), 300);
  });
}

function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qnt++;
  } else {
    cart.push({ id, name: product.name, price: product.price, img: product.img, qnt: 1 });
  }
  saveCart(); updateBadge(); renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart(); updateBadge(); renderCart();
}

function changeqnt(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qnt = Math.max(1, item.qnt + delta);
  saveCart(); updateBadge(); renderCart();
}

function showCartPanel() {
  const panel = document.getElementById('cart-panel');
  if (panel) {
    panel.classList.remove('hidden');
    panel.classList.add('visible');
  }
}

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

function closeCart() {
  const panel = document.getElementById('cart-panel');
  if (panel) {
    panel.classList.add('hidden');
    panel.classList.remove('visible');
  }
}

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

  // Mano, o que tu fez slc
  if (footer) footer.style.display = 'block';
  container.innerHTML = cart.map(item => `
    <div class="cart-item" id="ci-${item.id}">
      <img class="cart-item-img" src="${item.img}" alt="${item.name}">
      <div class="cart-item-body">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-price">R$ ${(item.price * item.qnt).toFixed(2).replace('.', ',')}</p>
        <div class="cart-item-qnt">
          <button class="qnt-btn" onclick="changeqnt(${item.id}, -1)">−</button>
          <span class="qnt-value">${item.qnt}</span>
          <button class="qnt-btn" onclick="changeqnt(${item.id}, +1)">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${item.id})" title="Remover">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`).join('');

  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = 'R$ ' + cartTotal().toFixed(2).replace('.', ',');
}

// Filtros
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

function updatePrice(val) {
  maxPrice = Number(val);
  document.getElementById('price-label').textContent = `R$ ${val}`;
  applyFilters();
}

function sortProducts(mode) { sortMode = mode; applyFilters(); }

function resetFilters() {
  document.querySelectorAll('.filter-option input').forEach(el => {
    el.checked = el.value !== 'encomenda';
  });
  maxPrice = 500;
  document.getElementById('price-range').value = 500;
  document.getElementById('price-label').textContent = 'R$ 500';
  sortMode = 'default';
  document.getElementById('sort-select').value = 'default';
  applyFilters();
}

// Produtos
function categoryLabel(cat) {
  return { kokedama: 'Kokedama', arranjo: 'Arranjo Floral', vaso: 'Vaso & Cachepot', servico: 'Serviço', acessorio: 'Acessório' }[cat] || cat;
}

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
    <div class="product-card" style="animation-delay:${idx * 0.05}s">
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
          <button class="btn-add-cart" onclick="addToCart(${p.id})" id="add-${p.id}">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar
          </button>
        </div>
      </div>
    </div>`).join('');
}

function checkout() {
  if (!localStorage.getItem('gl_logged_in')) {
    window.location.href = 'login.html';
  } else {
    alert('Imagine uma página de pagamento muito legal…');
  }
}

updateBadge();
renderCart();
applyFilters();

const cartPanel = document.getElementById('cart-panel');
if (cartPanel) {
  if (cart.length === 0) cartPanel.classList.add('hidden');
  else cartPanel.classList.add('visible');
}
