'use strict';

const { DataTypes } = require('sequelize');

/**
 * `SiteConfig` — configuração global do site (linha única / singleton).
 *
 * Controla o "Modo de Venda": quando `ecommerceActive` é `true`, o checkout usa
 * a Infinite Pay; quando `false`, o botão de compra vira "Pedir no WhatsApp" e
 * redireciona para `whatsapp.com` com o resumo do carrinho.
 *
 * Use sempre {@link getInstance} para ler/criar a linha singleton.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
module.exports = (sequelize) => {
  const SiteConfig = sequelize.define(
    'SiteConfig',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        defaultValue: 1,
      },
      /** Flag mestre do e-commerce (true = Infinite Pay, false = WhatsApp). */
      ecommerceActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      whatsappNumber: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      storeName: {
        type: DataTypes.STRING(120),
        allowNull: false,
        defaultValue: 'Gislei Lunkes Paisagismo',
      },
    },
    {
      tableName: 'site_config',
    }
  );

  /**
   * Retorna a linha de configuração singleton, criando-a com os padrões na
   * primeira chamada.
   * @returns {Promise<import('sequelize').Model>}
   */
  SiteConfig.getInstance = async function getInstance() {
    const [config] = await SiteConfig.findOrCreate({
      where: { id: 1 },
      defaults: { id: 1 },
    });
    return config;
  };

  return SiteConfig;
};
