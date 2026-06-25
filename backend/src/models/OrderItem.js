'use strict';

const { DataTypes } = require('sequelize');

/**
 * `OrderItem` — linha de um pedido.
 *
 * Guarda um *snapshot* do produto (nome e preço no momento da compra) além da
 * FK `productId`, para que o histórico do pedido permaneça correto mesmo que o
 * produto seja editado ou removido depois.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
module.exports = (sequelize) => {
  const OrderItem = sequelize.define(
    'OrderItem',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      /** Nome do produto no momento da compra. */
      productName: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1 },
      },
    },
    {
      tableName: 'order_items',
    }
  );

  return OrderItem;
};
