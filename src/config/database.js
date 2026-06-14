'use strict';

const { Sequelize } = require('sequelize');

/**
 * Sequelize connection instance.
 *
 * Reads credentials from environment variables. If `DATABASE_URL` is set it
 * takes precedence over the discrete `DB_*` variables (useful for managed
 * Postgres providers like Render/Heroku/Railway).
 *
 * @type {import('sequelize').Sequelize}
 */
const useSsl = String(process.env.DB_SSL).toLowerCase() === 'true';

const commonOptions = {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    // snake_case columns in the DB, camelCase in JS.
    underscored: true,
    timestamps: true,
  },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  dialectOptions: useSsl
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
};

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, commonOptions)
  : new Sequelize(
      process.env.DB_NAME || 'gislei_lunkes',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || 'postgres',
      {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        ...commonOptions,
      }
    );

module.exports = sequelize;
