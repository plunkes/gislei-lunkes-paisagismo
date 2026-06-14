'use strict';

const { DataTypes } = require('sequelize');

/**
 * `Order` — pedido realizado na loja.
 *
 * Pode pertencer a um `User` autenticado (`userId`) ou ser de convidado
 * (`userId` nulo, dados de contato preenchidos). `paymentMethod` registra qual
 * fluxo gerou o pedido: `infinitepay` (checkout online) ou `whatsapp` (resumo
 * enviado ao WhatsApp Business). Os itens ficam em `OrderItem`.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
module.exports = (sequelize) => {
  const Order = sequelize.define(
    'Order',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      customerName: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      customerEmail: {
        type: DataTypes.STRING(160),
        allowNull: true,
        validate: { isEmail: true },
      },
      customerPhone: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      paymentMethod: {
        type: DataTypes.ENUM('infinitepay', 'whatsapp'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          'pendente',
          'pago',
          'em_separacao',
          'enviado',
          'concluido',
          'cancelado'
        ),
        allowNull: false,
        defaultValue: 'pendente',
      },
      /** Referência externa do gateway (id da cobrança Infinite Pay). */
      paymentRef: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'orders',
    }
  );

  return Order;
};
