'use strict';

const { SiteConfig } = require('../models');

/**
 * GET /api/config/public — status público da loja (sem autenticação).
 *
 * Consumido pelo frontend para decidir o modo do botão de checkout:
 * `ecommerceActive=true` → Infinite Pay; `false` → WhatsApp.
 *
 * @type {import('express').RequestHandler}
 */
async function getPublic(_req, res) {
  const config = await SiteConfig.getInstance();
  res.json({
    ecommerceActive: config.ecommerceActive,
    whatsappNumber: config.whatsappNumber || process.env.WHATSAPP_NUMBER || null,
    storeName: config.storeName,
  });
}

/**
 * GET /api/backoffice/config — configuração completa. Funcionário.
 * @type {import('express').RequestHandler}
 */
async function getFull(_req, res) {
  const config = await SiteConfig.getInstance();
  res.json({ config });
}

/**
 * PUT /api/backoffice/config — atualiza configuração (toggle do e-commerce,
 * número do WhatsApp, nome da loja). Somente admin.
 *
 * @type {import('express').RequestHandler}
 */
async function update(req, res) {
  const config = await SiteConfig.getInstance();
  const { ecommerceActive, whatsappNumber, storeName } = req.body || {};

  if (ecommerceActive !== undefined) config.ecommerceActive = Boolean(ecommerceActive);
  if (whatsappNumber !== undefined) config.whatsappNumber = whatsappNumber || null;
  if (storeName !== undefined && storeName.trim()) config.storeName = storeName.trim();

  await config.save();
  res.json({ config });
}

module.exports = { getPublic, getFull, update };
