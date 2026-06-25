'use strict';

/** Códigos de erro de rede considerados transitórios (banco ainda subindo). */
const TRANSIENT_CODES = ['ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN', 'ETIMEDOUT'];

/**
 * Aguarda o banco ficar disponível, tentando autenticar com retentativas.
 *
 * Resolve a corrida de inicialização no Docker (o `app` pode subir antes do
 * serviço `db` resolver no DNS / aceitar conexões). Só repete em erros
 * transitórios de conexão; erros de credencial/SQL falham de imediato.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @param {{ retries?: number, delayMs?: number }} [opts]
 * @returns {Promise<void>}
 * @throws Repassa o último erro se esgotar as tentativas (ou erro não transitório).
 */
async function waitForDb(sequelize, { retries = 20, delayMs = 3000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await sequelize.authenticate();
      return;
    } catch (err) {
      const code = err.parent?.code || err.original?.code;
      const transient =
        TRANSIENT_CODES.includes(code) || /Connection/i.test(err.name || '');
      if (attempt === retries || !transient) throw err;
      console.log(
        `[db] Banco indisponível (tentativa ${attempt}/${retries}): ${err.message}. ` +
          `Nova tentativa em ${delayMs / 1000}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = waitForDb;
