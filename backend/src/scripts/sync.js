'use strict';

/**
 * Database sync script.
 *
 * Creates/updates all tables from the Sequelize models. Run with:
 *   npm run db:sync           (safe ALTER sync)
 *   npm run db:sync -- --force (DROP + recreate — apaga tudo!)
 *
 * Requires a reachable PostgreSQL instance configured via `.env`.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const { sequelize, SiteConfig } = require('../models');
const waitForDb = require('../config/waitForDb');

async function main() {
  const force = process.argv.includes('--force');
  const alter = !force;

  console.log(`[db:sync] Conectando ao PostgreSQL...`);
  await waitForDb(sequelize);
  console.log('[db:sync] Conexão OK.');

  console.log(`[db:sync] Sincronizando modelos (force=${force}, alter=${alter})...`);
  await sequelize.sync({ force, alter });

  // Garante a linha singleton de configuração do site.
  await SiteConfig.getInstance();

  console.log('[db:sync] Concluído com sucesso.');
  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('[db:sync] Falhou:', err.message);
  process.exit(1);
});
