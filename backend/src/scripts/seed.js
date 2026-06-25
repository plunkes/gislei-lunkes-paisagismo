'use strict';

/**
 * Seed script — popula dados iniciais para desenvolvimento.
 *
 * - Cria o admin do backoffice a partir das variáveis SEED_ADMIN_* do `.env`.
 * - Insere o catálogo inicial de produtos (espelha o mock do frontend).
 * - Garante a linha singleton de SiteConfig.
 *
 * Idempotente: usa findOrCreate, pode rodar várias vezes. Execute após o
 * `npm run db:sync`:  `npm run db:seed`
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const bcrypt = require('bcryptjs');
const { sequelize, Employee, Product, SiteConfig } = require('../models');
const waitForDb = require('../config/waitForDb');

/** Catálogo inicial (mesmos itens de public/js/produtos.js). */
const PRODUCTS = [
  { name: 'Kokedama Monstera', category: 'kokedama', badge: 'novo', description: 'Monstera deliciosa cultivada em bola de musgo artesanal. Perfeita para ambientes iluminados.', price: 89.9, oldPrice: null, quantity: 12, stockStatus: 'disponivel', imageUrl: 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=600&q=80' },
  { name: 'Kokedama Samambaia', category: 'kokedama', badge: null, description: 'Samambaia exuberante com textura delicada, ideal para varanda e banheiro.', price: 64.9, oldPrice: null, quantity: 8, stockStatus: 'disponivel', imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80' },
  { name: 'Arranjo Floral Rosa', category: 'arranjo', badge: 'oferta', description: 'Composição com rosas frescas, verdes e flores silvestres. Duração de 7 a 10 dias.', price: 129.9, oldPrice: 160.0, quantity: 5, stockStatus: 'disponivel', imageUrl: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&q=80' },
  { name: 'Cachepot Cerâmica Sage', category: 'vaso', badge: null, description: 'Cachepot artesanal em cerâmica com acabamento fosco, cor sage. 15 cm de diâmetro.', price: 49.9, oldPrice: null, quantity: 20, stockStatus: 'disponivel', imageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80' },
  { name: 'Kokedama Peperômia', category: 'kokedama', badge: null, description: 'Peperômia obtusifolia em musgo natural. Baixa manutenção, ótima para escritórios.', price: 54.9, oldPrice: null, quantity: 15, stockStatus: 'disponivel', imageUrl: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=600&q=80' },
  { name: 'Arranjo Escritório', category: 'arranjo', badge: 'novo', description: 'Centro de mesa com plantas tropicais de baixa manutenção, ideal para ambientes corporativos.', price: 189.9, oldPrice: null, quantity: 6, stockStatus: 'disponivel', imageUrl: 'https://images.unsplash.com/photo-1524247108137-732e0f642303?w=600&q=80' },
  { name: 'Vaso Terracota Rústico', category: 'vaso', badge: null, description: 'Vaso de terracota envelhecida com pátina artesanal. 20 cm. Produto exclusivo.', price: 69.9, oldPrice: null, quantity: 10, stockStatus: 'disponivel', imageUrl: 'https://images.unsplash.com/photo-1512428813834-c702c7702b78?w=600&q=80' },
  { name: 'Kit Substrato Especial', category: 'acessorio', badge: null, description: 'Mistura ideal para kokedamas: musgo xaxim, terra vegetal e perlita. 2 kg.', price: 34.9, oldPrice: null, quantity: 30, stockStatus: 'disponivel', imageUrl: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600&q=80' },
  { name: 'Workshop de kokedamas', category: 'servico', badge: null, description: 'Workshop para ensinar a técnica do kokedama: a bola de musgo. Sem conhecimento prévio necessário.', price: 150.0, oldPrice: null, quantity: 0, stockStatus: 'encomenda', imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80' },
  { name: 'Fertilizante Orgânico', category: 'acessorio', badge: null, description: 'Adubo 100% orgânico, ideal para plantas ornamentais e kokedamas. 500 g.', price: 24.9, oldPrice: null, quantity: 40, stockStatus: 'disponivel', imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80' },
];

async function main() {
  await waitForDb(sequelize);

  // 1) Admin do backoffice
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@gislei.com';
  const passwordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD || 'changeme123',
    10
  );
  const [admin, adminCreated] = await Employee.findOrCreate({
    where: { email },
    defaults: {
      name: process.env.SEED_ADMIN_NAME || 'Administrador',
      email,
      passwordHash,
      role: 'admin',
    },
  });
  console.log(
    adminCreated
      ? `[seed] Admin criado: ${admin.email}`
      : `[seed] Admin já existe: ${admin.email}`
  );

  // 2) Produtos
  let inserted = 0;
  for (const p of PRODUCTS) {
    const [, created] = await Product.findOrCreate({
      where: { name: p.name },
      defaults: p,
    });
    if (created) inserted += 1;
  }
  console.log(`[seed] Produtos inseridos: ${inserted}/${PRODUCTS.length}`);

  // 3) Config singleton
  await SiteConfig.getInstance();
  console.log('[seed] SiteConfig garantido.');

  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] Falhou:', err.message);
  process.exit(1);
});
