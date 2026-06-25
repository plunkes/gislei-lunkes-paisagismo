'use strict';

const { DataTypes } = require('sequelize');

/**
 * `User` — cliente final do e-commerce.
 *
 * Suporta autenticação local (email + senha hasheada) e Google OAuth
 * (`googleId` preenchido, `passwordHash` nulo). O e-mail é único.
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
        validate: { notEmpty: true },
      },
      email: {
        type: DataTypes.STRING(160),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      /** Telefone/WhatsApp (somente dígitos). Obrigatório para finalizar compra. */
      phone: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      /** Hash bcrypt da senha. Nulo para contas criadas via Google. */
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      /** `sub` (subject) retornado pelo Google. Nulo para contas locais. */
      googleId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      provider: {
        type: DataTypes.ENUM('local', 'google'),
        allowNull: false,
        defaultValue: 'local',
      },
      avatarUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'users',
    }
  );

  return User;
};
