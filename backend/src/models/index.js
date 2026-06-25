'use strict';

const sequelize = require('../config/database');

/**
 * Model registry + associations.
 *
 * Loads every Sequelize model factory, wires the relationships, and re-exports
 * the configured `sequelize` instance alongside the models. Import models from
 * here (never from the individual files) so associations are guaranteed set up.
 *
 * @module models
 */
const User = require('./User')(sequelize);
const Employee = require('./Employee')(sequelize);
const Product = require('./Product')(sequelize);
const Order = require('./Order')(sequelize);
const OrderItem = require('./OrderItem')(sequelize);
const SiteConfig = require('./SiteConfig')(sequelize);
const Analytics = require('./Analytics')(sequelize);

// --- Associations ---------------------------------------------------------

// A user can have many orders; a guest order has userId = null.
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// An order is composed of line items.
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// A line item references a product (nullable: product may be deleted later).
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

module.exports = {
  sequelize,
  User,
  Employee,
  Product,
  Order,
  OrderItem,
  SiteConfig,
  Analytics,
};
