'use strict';

const { Analytics } = require('../models');

/** Extensões de assets estáticos que não devem gerar pageview. */
const ASSET_RE = /\.(css|js|svg|png|jpe?g|gif|webp|mp4|ico|woff2?|map)$/i;

/**
 * Middleware de estatísticas de uso — **100% anônimo** (LGPD).
 *
 * Registra um *pageview* agregado por dia para requisições GET de páginas
 * (HTML), ignorando chamadas de API e arquivos estáticos. NÃO captura IP,
 * user-agent, usuário, cookies ou qualquer dado pessoal — apenas o caminho.
 *
 * É *fire-and-forget*: nunca bloqueia nem quebra a requisição (erros de banco
 * são silenciados), e não adiciona latência perceptível.
 *
 * @type {import('express').RequestHandler}
 */
function trackPageviews(req, _res, next) {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !ASSET_RE.test(req.path)) {
    // Normaliza '/' e remove querystring (que poderia conter dados).
    const path = req.path === '/' ? '/index.html' : req.path;
    Analytics.track({ eventType: 'pageview', path }).catch(() => {});
  }
  next();
}

module.exports = { trackPageviews };
