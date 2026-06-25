'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Integração com a API da Infinite Pay (checkout online).
 *
 * IMPORTANTE — chaves: as credenciais vêm do `.env` e são injetadas aqui:
 *   - INFINITEPAY_API_KEY   → header Authorization (Bearer)
 *   - INFINITEPAY_HANDLE    → identificador da conta (handle do recebedor)
 *   - INFINITEPAY_API_URL   → base da API (default https://api.infinitepay.io)
 *
 * Os nomes/campos exatos do payload devem ser confirmados na documentação
 * oficial da Infinite Pay; a estrutura abaixo deixa claro ONDE cada dado entra.
 */

const API_URL = process.env.INFINITEPAY_API_URL || 'https://api.infinitepay.io';

/**
 * Cria um link de pagamento (checkout) na Infinite Pay para um pedido.
 *
 * @param {object} params
 * @param {string} params.orderId - Id interno do pedido (referência externa).
 * @param {Array<{productName: string, unitPrice: number, quantity: number}>} params.items
 * @param {number} params.total - Total em reais.
 * @param {{name: string, email?: string, phone?: string}} params.customer
 * @returns {Promise<{checkoutUrl: string, paymentRef: string}>}
 * @throws {ApiError} Se as chaves não estiverem configuradas ou a API falhar.
 */
async function createPaymentLink({ orderId, items, total, customer }) {
  // --- Injeção das chaves do .env -----------------------------------------
  const apiKey = process.env.INFINITEPAY_API_KEY;
  const handle = process.env.INFINITEPAY_HANDLE;
  if (!apiKey || !handle) {
    throw new ApiError(
      503,
      'Checkout online indisponível: chaves da Infinite Pay não configuradas.'
    );
  }

  // Valores monetários geralmente trafegam em centavos.
  const amountInCents = Math.round(Number(total) * 100);

  // Estrutura do corpo da requisição (ajustar conforme doc oficial).
  const payload = {
    handle, // conta recebedora (do .env)
    order_nsu: orderId, // nosso id de pedido como referência
    amount: amountInCents,
    currency: 'BRL',
    items: items.map((i) => ({
      description: i.productName,
      quantity: i.quantity,
      price: Math.round(Number(i.unitPrice) * 100),
    })),
    customer: {
      name: customer.name,
      email: customer.email || undefined,
      phone: customer.phone || undefined,
    },
    // URLs de retorno após o pagamento (ajuste o domínio em produção).
    redirect_url: `${process.env.APP_URL || 'http://localhost:3000'}/produtos.html?pedido=${orderId}`,
  };

  try {
    // --- Chamada à Infinite Pay -------------------------------------------
    const response = await fetch(`${API_URL}/v2/checkouts`, {
      method: 'POST',
      headers: {
        // Chave do .env injetada no Authorization:
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new ApiError(502, `Falha na Infinite Pay (${response.status}). ${detail}`);
    }

    const data = await response.json();
    // Campos de retorno conforme doc oficial (ajustar nomes se necessário):
    return {
      checkoutUrl: data.checkout_url || data.url,
      paymentRef: data.id || data.transaction_id || orderId,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Erro de rede / fetch.
    throw new ApiError(502, `Erro ao contatar a Infinite Pay: ${err.message}`);
  }
}

/**
 * Gera um payload PIX simulado ("copia e cola") para o modo de demonstração,
 * quando as chaves reais da Infinite Pay não estão configuradas.
 *
 * NÃO é um BR Code EMV válido para bancos reais — serve apenas para exibir o
 * fluxo de QR Code / PIX na interface. Em produção, use {@link createPaymentLink}
 * com as chaves reais e o código PIX retornado pela Infinite Pay.
 *
 * @param {string} orderId
 * @param {number} total
 * @returns {string}
 */
function buildMockPixCode(orderId, total) {
  const handle = process.env.INFINITEPAY_HANDLE || 'gislei-lunkes';
  const amount = Number(total).toFixed(2);
  return `00020126BR.GOV.BCB.PIX.DEMO/${handle}/${orderId}5204000053039865406${amount}5802BR5913GISLEI LUNKES6009SAO PAULO62070503***6304DEMO`;
}

/**
 * Monta a URL de imagem de um QR Code a partir de um conteúdo textual.
 * Usa um serviço público de geração de QR (sem dependências no projeto).
 *
 * @param {string} data - Conteúdo a codificar (ex.: código PIX).
 * @returns {string}
 */
function qrImageUrlFor(data) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    data
  )}`;
}

/**
 * Cria uma cobrança para o checkout, retornando os dados de pagamento via PIX
 * (código "copia e cola" + URL do QR Code) para a tela de conclusão.
 *
 * Comportamento:
 *  - Com chaves da Infinite Pay configuradas: cria o link/cobrança real
 *    ({@link createPaymentLink}) e deriva o QR a partir da URL de checkout.
 *  - Sem chaves (modo demo): gera um PIX simulado para exibir o fluxo.
 *
 * @param {object} params
 * @param {string} params.orderId
 * @param {Array<{productName: string, unitPrice: number, quantity: number}>} params.items
 * @param {number} params.total
 * @param {{name: string, email?: string, phone?: string}} params.customer
 * @returns {Promise<{ paymentRef: string, pixCode: string, qrImageUrl: string, checkoutUrl: string|null }>}
 */
async function createCharge({ orderId, items, total, customer }) {
  const hasKeys = process.env.INFINITEPAY_API_KEY && process.env.INFINITEPAY_HANDLE;
  const isProd = process.env.NODE_ENV === 'production';

  if (hasKeys) {
    try {
      // Caminho real: link de checkout da Infinite Pay; QR aponta para a URL.
      const { checkoutUrl, paymentRef } = await createPaymentLink({
        orderId,
        items,
        total,
        customer,
      });
      return {
        paymentRef,
        pixCode: checkoutUrl,
        qrImageUrl: qrImageUrlFor(checkoutUrl),
        checkoutUrl,
      };
    } catch (err) {
      // Em produção, a falha real deve aparecer. Fora de produção (ex.: chaves
      // de placeholder/inválidas), cai no modo demo para não travar o fluxo.
      if (isProd) throw err;
      console.warn(`[infinitePay] API real falhou (${err.message}). Usando modo demo.`);
    }
  }

  // Caminho demo: PIX simulado (sem chaves válidas).
  const pixCode = buildMockPixCode(orderId, total);
  return {
    paymentRef: `demo-${orderId}`,
    pixCode,
    qrImageUrl: qrImageUrlFor(pixCode),
    checkoutUrl: null,
  };
}

module.exports = { createPaymentLink, createCharge };
