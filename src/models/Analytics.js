'use strict';

const { DataTypes } = require('sequelize');

/**
 * `Analytics` — eventos de uso 100% anônimos e agregados (uso interno).
 *
 * Conformidade LGPD: NÃO armazena IP, user-agent, id de usuário, nem qualquer
 * dado pessoal. Cada linha é um contador agregado por (dia, tipo de evento,
 * caminho, referência opcional), incrementado via {@link track}. Assim não é
 * possível reconstruir a jornada de um indivíduo. Ver `TERMOS_DE_USO.md`.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
module.exports = (sequelize) => {
  const Analytics = sequelize.define(
    'Analytics',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      /** Dia da agregação (sem hora) — granularidade máxima permitida. */
      day: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      /** Tipo do evento: 'pageview', 'product_click', 'add_to_cart', etc. */
      eventType: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      /** Caminho da rota (ex.: '/produtos'). Sem query string com PII. */
      path: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      /** Referência opcional não-pessoal (ex.: id de produto). */
      refId: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      /** Contador agregado de ocorrências. */
      count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'analytics',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['day', 'event_type', 'path', 'ref_id'],
          name: 'analytics_unique_bucket',
        },
      ],
    }
  );

  /**
   * Incrementa (ou cria) o balde agregado do evento para o dia atual.
   * Operação anônima: nenhum dado pessoal é tocado.
   *
   * @param {object} evt
   * @param {string} evt.eventType
   * @param {string|null} [evt.path]
   * @param {string|null} [evt.refId]
   * @returns {Promise<void>}
   */
  Analytics.track = async function track({ eventType, path = null, refId = null }) {
    const day = new Date().toISOString().slice(0, 10);
    const [row, created] = await Analytics.findOrCreate({
      where: { day, eventType, path, refId },
      defaults: { day, eventType, path, refId, count: 1 },
    });
    if (!created) {
      await row.increment('count');
    }
  };

  return Analytics;
};
