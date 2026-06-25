'use strict';

/**
 * Scripts compartilhados do site público (Vanilla JS):
 * sidebar mobile, acordeão de FAQ e botões de WhatsApp com mensagem
 * pré-configurada. Sem dependências/frameworks.
 */

/** Número padrão do WhatsApp (fallback se a API não responder). */
const WHATSAPP_DEFAULT = '5511987863324';

/** Mensagem padrão pré-preenchida do contato. */
const WHATSAPP_MESSAGE =
  'Olá! Vim pelo site da Gislei Lunkes Paisagismo e gostaria de mais informações. 🌿';

/**
 * Monta uma URL `wa.me` com mensagem pré-preenchida.
 * @param {string} number - Somente dígitos, com DDI.
 * @param {string} message
 * @returns {string}
 */
function buildWhatsAppUrl(number, message) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Liga o sidebar mobile (hamburger, botão fechar e overlay). */
function initSidebar() {
  const burger = document.getElementById('hamburger');
  const sidebar = document.getElementById('mobile-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!burger || !sidebar || !overlay) return;

  const open = () => {
    sidebar.classList.add('open');
    overlay.classList.add('open');
  };
  const close = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  };

  burger.addEventListener('click', open);
  overlay.addEventListener('click', close);
  document.getElementById('sidebar-close')?.addEventListener('click', close);
  // Fecha ao clicar em qualquer link da sidebar.
  sidebar.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
}

/** Liga o acordeão da seção de FAQ. */
function initFaq() {
  document.querySelectorAll('.faq-item').forEach((item) => {
    const q = item.querySelector('.faq-question');
    if (!q) return;
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Fecha os demais (comportamento de acordeão).
      document.querySelectorAll('.faq-item.open').forEach((el) => el.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

/**
 * Preenche o href de todos os elementos de WhatsApp (`.whatsapp-float`,
 * `[data-whatsapp]`). Tenta usar o número configurado no backoffice; em caso de
 * falha usa o padrão.
 */
async function initWhatsApp() {
  let number = WHATSAPP_DEFAULT;
  try {
    const res = await fetch('/api/config/public');
    if (res.ok) {
      const cfg = await res.json();
      if (cfg.whatsappNumber) number = cfg.whatsappNumber;
    }
  } catch {
    /* offline: mantém o número padrão */
  }

  const url = buildWhatsAppUrl(number, WHATSAPP_MESSAGE);
  document.querySelectorAll('.whatsapp-float, [data-whatsapp]').forEach((el) => {
    el.setAttribute('href', url);
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
  });
}

// ---------------------------------------------------------------------------
// LGPD — consentimento de cookies + tracking anônimo
// ---------------------------------------------------------------------------

/** Chave da preferência de consentimento no localStorage. */
const CONSENT_KEY = 'gl_cookie_consent';

/**
 * Envia um evento de uso anônimo ao backend (`POST /api/track`).
 * Só dispara se o usuário não tiver recusado os cookies. Fire-and-forget:
 * nunca lança nem bloqueia a navegação. Não envia dados pessoais.
 *
 * @param {string} eventType - 'product_click' | 'add_to_cart' | 'checkout_start'
 * @param {string|null} [refId] - Referência não-pessoal (ex.: id de produto).
 */
function trackEvent(eventType, refId = null) {
  if (localStorage.getItem(CONSENT_KEY) === 'rejected') return;
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, refId, path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignora */
  }
}
// Exposto globalmente para uso em outras páginas (ex.: produtos.js).
window.trackEvent = trackEvent;

/** Injeta e controla o banner de consentimento de cookies (LGPD). */
function initCookieBanner() {
  if (localStorage.getItem(CONSENT_KEY)) return; // já decidiu

  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.innerHTML = `
    <p>Usamos armazenamento local para manter sua sessão e o carrinho, e
       coletamos estatísticas <strong>anônimas e agregadas</strong> para melhorar
       o site. Saiba mais em nossos <a href="/TERMOS_DE_USO.md" target="_blank" rel="noopener">Termos de Uso</a>.</p>
    <div class="cookie-actions">
      <button class="cookie-btn reject" id="cookie-reject">Recusar</button>
      <button class="cookie-btn accept" id="cookie-accept">Aceitar</button>
    </div>`;
  document.body.appendChild(banner);

  const close = (choice) => {
    localStorage.setItem(CONSENT_KEY, choice);
    banner.remove();
  };
  document.getElementById('cookie-accept').addEventListener('click', () => close('accepted'));
  document.getElementById('cookie-reject').addEventListener('click', () => close('rejected'));
}

// ---------------------------------------------------------------------------
// Máscara de telefone (WhatsApp) + Toasts
// ---------------------------------------------------------------------------

/**
 * Formata uma string de dígitos no padrão de telefone brasileiro.
 * Ex.: '11990001234' → '(11) 99000-1234'; '1130001234' → '(11) 3000-1234'.
 * @param {string} value - Texto cru (pode conter máscara).
 * @returns {string}
 */
function formatPhone(value) {
  const d = String(value).replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Aplica a máscara de telefone em todos os inputs `[data-phone-mask]`. */
function initPhoneMasks() {
  document.querySelectorAll('input[data-phone-mask]').forEach((input) => {
    const apply = () => {
      input.value = formatPhone(input.value);
    };
    input.addEventListener('input', apply);
    if (input.value) apply();
  });
}
window.formatPhone = formatPhone;
window.initPhoneMasks = initPhoneMasks;

/**
 * Exibe um toast (mensagem flutuante) — substitui `alert()`.
 * @param {string} message
 * @param {'info'|'error'|'success'} [type]
 * @param {number} [duration] - ms até sumir.
 */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  // força reflow para animar a entrada
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}
window.showToast = showToast;

/**
 * Revela as seções de conteúdo conforme entram na viewport (fade + subida).
 * Só atua nas seções da página inicial; em outras páginas é um no-op. Respeita
 * `prefers-reduced-motion` e degrada para conteúdo visível sem IntersectionObserver.
 */
function initReveal() {
  const els = document.querySelectorAll(
    '.quem-somos, .servicos, .cards-section, .portfolio, .faq, .contato'
  );
  if (!els.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('reveal', 'is-visible'));
    return;
  }

  els.forEach((el) => el.classList.add('reveal'));
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  els.forEach((el) => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initFaq();
  initWhatsApp();
  initCookieBanner();
  initPhoneMasks();
  initReveal();
});
