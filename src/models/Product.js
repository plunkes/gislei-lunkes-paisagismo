'use strict';

const { DataTypes } = require('sequelize');

/**
 * `Product` — kokedama, arranjo, vaso, serviço ou acessório vendido na loja.
 *
 * Espelha a estrutura usada no frontend (`public/js/produtos.js`): categoria,
 * badge opcional, preço atual e preço antigo. Acrescenta controle de estoque
 * (`quantity`) e flag `active` para ocultar sem apagar.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
module.exports = (sequelize) => {
  const Product = sequelize.define(
    'Product',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(160),
        allowNull: false,
        validate: { notEmpty: true },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.ENUM(
          'kokedama',
          'arranjo',
          'vaso',
          'servico',
          'acessorio'
        ),
        allowNull: false,
        defaultValue: 'kokedama',
      },
      /** Selo opcional exibido no card. */
      badge: {
        type: DataTypes.ENUM('novo', 'oferta'),
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      /** Preço "de" (riscado) para promoções. Nulo quando não há desconto. */
      oldPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: { min: 0 },
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      /** Quantidade em estoque. 0 = esgotado. */
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      /** Estado de disponibilidade espelhando o frontend. */
      stockStatus: {
        type: DataTypes.ENUM('disponivel', 'encomenda'),
        allowNull: false,
        defaultValue: 'disponivel',
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'products',
    }
  );

  return Product;
};
