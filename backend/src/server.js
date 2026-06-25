'use strict';

const path = require('path');
// .env mora na raiz do repositório (dois níveis acima de backend/src).
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');

const { sequelize } = require('./models');
const apiRoutes = require('./routes');
const openapiSpec = require('./docs/openapi');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimit');
const { trackPageviews } = require('./middlewares/analytics');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
// Layout do repositório: backend/ e frontend/ são irmãos na raiz. A partir de
// backend/src sobe dois níveis até a raiz; os uploads ficam em backend/uploads.
const ROOT_DIR = path.join(__dirname, '..', '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'frontend');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// --- Segurança / parsing -------------------------------------------------
// CSP desligado: o frontend estático usa scripts inline (onclick), fontes do
// Google e imagens externas (Unsplash) + Google Identity Services. Ajuste uma
// política específica antes de produção, se desejar endurecer.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(
  cors({
    origin: process.env.APP_URL || true,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Documentação Swagger (OpenAPI) ---------------------------------------
app.get('/api/docs.json', (_req, res) => res.json(openapiSpec));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: 'Gislei Lunkes — API Docs',
}));

// --- API ------------------------------------------------------------------
app.use('/api', apiLimiter, apiRoutes);

// --- Estatísticas de uso (pageviews anônimos) -----------------------------
app.use(trackPageviews);

// Termos de Uso / Política de Privacidade (arquivo na raiz do repositório).
app.get('/TERMOS_DE_USO.md', (_req, res) => {
  res.type('text/markdown; charset=utf-8');
  res.sendFile(path.join(ROOT_DIR, 'TERMOS_DE_USO.md'));
});

// --- Uploads do backoffice (imagens de produto) ---------------------------
// Servidos estaticamente em /uploads/<arquivo>. A URL retornada pela rota de
// upload é relativa, então funciona em qualquer host.
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Frontend estático ----------------------------------------------------
app.use(express.static(PUBLIC_DIR));

// --- 404 + erros ----------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

/**
 * Inicializa o servidor. Tenta autenticar no Postgres (apenas log de aviso se
 * falhar — o frontend estático continua servível mesmo sem banco).
 */
async function start() {
  try {
    await sequelize.authenticate();
    console.log('[server] PostgreSQL conectado.');
  } catch (err) {
    console.warn('[server] Sem conexão com o banco:', err.message);
    console.warn('[server] Configure o .env e rode `npm run db:sync`.');
  }

  app.listen(PORT, () => {
    console.log(`[server] Rodando em http://localhost:${PORT}`);
  });
}

// Só sobe o servidor quando executado diretamente (facilita testes).
if (require.main === module) {
  start();
}

module.exports = app;
