'use strict';

const { DataTypes } = require('sequelize');

/**
 * `Employee` — funcionário do backoffice (entidade separada de `User`).
 *
 * Campos: nome, email único, senha hasheada e cargo (`role`). O cargo `admin`
 * tem acesso total; `funcionario` tem acesso operacional (estoque/pedidos).
 *
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
module.exports = (sequelize) => {
  const Employee = sequelize.define(
    'Employee',
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
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('admin', 'funcionario'),
        allowNull: false,
        defaultValue: 'funcionario',
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'employees',
    }
  );

  return Employee;
};
